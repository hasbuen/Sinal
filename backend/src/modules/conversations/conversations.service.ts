import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDirectConversationInput } from "./dto/create-direct-conversation.input";
import { CreateGroupConversationInput } from "./dto/create-group-conversation.input";
import { AddMembersInput } from "./dto/add-members.input";
import { CacheSqliteService } from "../../sqlite/cache-sqlite.service";

const conversationInclude = {
  members: {
    include: {
      user: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 30,
    include: {
      sender: true,
      attachments: true,
      reactions: {
        include: {
          user: true,
        },
      },
      replyTo: true,
      forwardedFrom: true,
      savedByIds: true,
    },
  },
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqliteCache: CacheSqliteService,
  ) {}

  private getVisibleMessages<T extends { expiresAt?: Date | null; savedByIds?: string[] | null }>(
    messages: T[],
    currentUserId: string,
  ) {
    const now = Date.now();
    return messages.filter((message) => {
      if (!message.expiresAt) {
        return true;
      }

      return (
        message.expiresAt.getTime() > now ||
        (message.savedByIds ?? []).includes(currentUserId)
      );
    });
  }

  private toConversationPayload<T extends { messages: Array<{ savedByIds?: string[] | null; expiresAt?: Date | null }> }>(
    conversation: T,
    currentUserId: string,
  ) {
    const visibleMessages = this.getVisibleMessages(conversation.messages, currentUserId);
    const latestMessage = visibleMessages[0]
      ? {
          ...visibleMessages[0],
          isSaved: (visibleMessages[0].savedByIds ?? []).includes(currentUserId),
        }
      : null;

    return {
      ...conversation,
      latestMessage,
    };
  }

  async findForUser(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: conversationInclude,
      orderBy: {
        updatedAt: "desc",
      },
    });

    conversations.forEach((conversation: (typeof conversations)[number]) => {
      this.sqliteCache.cacheConversation(
        conversation.id,
        JSON.stringify(conversation),
      );
    });

    return conversations.map((conversation: (typeof conversations)[number]) =>
      this.toConversationPayload(conversation, userId),
    );
  }

  async createDirectConversation(
    currentUserId: string,
    input: CreateDirectConversationInput,
  ) {
    if (currentUserId === input.userId) {
      throw new BadRequestException("Nao e possivel criar conversa com si mesmo.");
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        kind: "DIRECT",
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: input.userId } } },
        ],
      },
      include: conversationInclude,
    });

    if (existing) {
      return this.toConversationPayload(existing, currentUserId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        kind: "DIRECT",
        members: {
          create: [
            { userId: currentUserId, role: "OWNER" },
            { userId: input.userId, role: "MEMBER" },
          ],
        },
      },
      include: conversationInclude,
    });

    return {
      ...conversation,
      latestMessage: null,
    };
  }

  async createGroupConversation(
    currentUserId: string,
    input: CreateGroupConversationInput,
  ) {
    const uniqueMembers = [...new Set([currentUserId, ...input.memberIds])];
    const conversation = await this.prisma.conversation.create({
      data: {
        kind: "GROUP",
        title: input.title,
        description: input.description,
        createdById: currentUserId,
        members: {
          create: uniqueMembers.map((userId) => ({
            userId,
            role: userId === currentUserId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: conversationInclude,
    });

    return {
      ...conversation,
      latestMessage: null,
    };
  }

  async addMembers(currentUserId: string, input: AddMembersInput) {
    await this.assertMembership(input.conversationId, currentUserId);
    const existingMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId: input.conversationId },
      select: { userId: true },
    });
    const existingIds = new Set(existingMembers.map((member: { userId: string }) => member.userId));
    const newIds = input.memberIds.filter((memberId) => !existingIds.has(memberId));

    if (newIds.length > 0) {
      await this.prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          members: {
            create: newIds.map((userId) => ({
              userId,
              role: "MEMBER",
            })),
          },
        },
      });
    }

    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: input.conversationId },
      include: conversationInclude,
    });

    return this.toConversationPayload(conversation, currentUserId);
  }

  async markConversationRead(currentUserId: string, conversationId: string) {
    await this.assertMembership(conversationId, currentUserId);
    await this.prisma.conversationMember.updateMany({
      where: {
        conversationId,
        userId: currentUserId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });
    return true;
  }

  async assertMembership(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!membership) {
      throw new BadRequestException("Usuario nao pertence a esta conversa.");
    }
  }
}
