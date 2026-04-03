import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDirectConversationInput } from "./dto/create-direct-conversation.input";
import { CreateGroupConversationInput } from "./dto/create-group-conversation.input";
import { AddMembersInput } from "./dto/add-members.input";
import { PresenceHeartbeatInput } from "./dto/presence-heartbeat.input";
import { CacheSqliteService } from "../../sqlite/cache-sqlite.service";
import {
  MessageEventType,
} from "./models/chat.enums";
import { RedisService } from "../../redis/redis.service";
import { messagePubSub, presencePubSub } from "../messages/chat.events";

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
    },
  },
};

type PresencePayload = {
  userId: string;
  online: boolean;
  lastSeenAt?: string | null;
  activeConversationId?: string | null;
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqliteCache: CacheSqliteService,
    private readonly redisService: RedisService,
  ) {}

  private getVisibleMessages<
    T extends {
      expiresAt?: Date | null;
      savedByIds?: string[] | null;
    },
  >(messages: T[], currentUserId: string) {
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

  private toConversationPayload<
    T extends {
      messages: Array<{
        savedByIds?: string[] | null;
        expiresAt?: Date | null;
      }>;
    },
  >(conversation: T, currentUserId: string) {
    const visibleMessages = this.getVisibleMessages(
      conversation.messages,
      currentUserId,
    );
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

  private async syncMessageReceipts(
    currentUserId: string,
    conversationId: string,
    markAsRead: boolean,
  ) {
    const candidates = (await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: {
          not: currentUserId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })) as Array<{
      id: string;
      deliveredToIds?: string[] | null;
      readByIds?: string[] | null;
    }>;

    for (const message of candidates) {
      const deliveredToIds = new Set(message.deliveredToIds ?? []);
      const readByIds = new Set(message.readByIds ?? []);
      let changed = false;

      if (!deliveredToIds.has(currentUserId)) {
        deliveredToIds.add(currentUserId);
        changed = true;
      }

      if (markAsRead && !readByIds.has(currentUserId)) {
        readByIds.add(currentUserId);
        changed = true;
      }

      if (!changed) {
        continue;
      }

      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          deliveredToIds: { set: Array.from(deliveredToIds) },
          readByIds: { set: Array.from(readByIds) },
        } as Prisma.MessageUpdateInput,
      });

      await messagePubSub.publish("message.event", {
        messageEvent: {
          messageId: message.id,
          conversationId,
          event: MessageEventType.RECEIPT,
        },
        conversationId,
      });
    }
  }

  private async publishPresence(
    conversationId: string,
    userId: string,
    payload: PresencePayload,
  ) {
    await presencePubSub.publish("presence.changed", {
      presenceChanged: {
        userId,
        online: payload.online,
        lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : null,
        activeConversationId: payload.activeConversationId ?? null,
      },
      conversationId,
    });
  }

  private async resolvePresenceForUser(userId: string) {
    const payload = await this.redisService.getPresence(userId);
    if (payload) {
      const parsed = JSON.parse(payload) as PresencePayload;
      return {
        userId,
        online: parsed.online,
        lastSeenAt: parsed.lastSeenAt ? new Date(parsed.lastSeenAt) : null,
        activeConversationId: parsed.activeConversationId ?? null,
      };
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as { lastSeenAt?: Date | null } | null;

    return {
      userId,
      online: false,
      lastSeenAt: user?.lastSeenAt ?? null,
      activeConversationId: null,
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
      this.sqliteCache.cacheConversation(conversation.id, JSON.stringify(conversation));
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
    const existingIds = new Set(
      existingMembers.map((member: { userId: string }) => member.userId),
    );
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
    await this.syncMessageReceipts(currentUserId, conversationId, true);
    return true;
  }

  async heartbeat(currentUserId: string, input: PresenceHeartbeatInput) {
    if (input.activeConversationId) {
      await this.assertMembership(input.activeConversationId, currentUserId);
    }

    const lastSeenAt = new Date();
    const payload: PresencePayload = {
      userId: currentUserId,
      online: true,
      lastSeenAt: lastSeenAt.toISOString(),
      activeConversationId: input.activeConversationId ?? null,
    };

    await this.redisService.setPresence(currentUserId, JSON.stringify(payload), 70);
    await this.prisma.user.update({
      where: { id: currentUserId },
      data: {
        lastSeenAt,
      },
    });

    if (input.activeConversationId) {
      await this.publishPresence(input.activeConversationId, currentUserId, payload);
    }

    return {
      userId: currentUserId,
      online: true,
      lastSeenAt,
      activeConversationId: input.activeConversationId ?? null,
    };
  }

  async conversationPresence(currentUserId: string, conversationId: string) {
    await this.assertMembership(conversationId, currentUserId);

    const members = await this.prisma.conversationMember.findMany({
      where: {
        conversationId,
      },
      select: {
        userId: true,
      },
    });

    return Promise.all(
      members.map((member: { userId: string }) =>
        this.resolvePresenceForUser(member.userId),
      ),
    );
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
