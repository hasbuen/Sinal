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
    take: 1,
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
    },
  },
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqliteCache: CacheSqliteService,
  ) {}

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

    return conversations.map((conversation: (typeof conversations)[number]) => ({
      ...conversation,
      latestMessage: conversation.messages[0] ?? null,
    }));
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
      return {
        ...existing,
        latestMessage: existing.messages[0] ?? null,
      };
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

    return {
      ...conversation,
      latestMessage: conversation.messages[0] ?? null,
    };
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
