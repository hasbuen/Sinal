import { BadRequestException, Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { PrismaService } from "../../prisma/prisma.service";
import { ConversationsService } from "../conversations/conversations.service";
import { SendMessageInput } from "./dto/send-message.input";
import { ReactToMessageInput } from "./dto/react-to-message.input";
import { ConversationMessagesInput } from "./dto/conversation-messages.input";
import { TypingInput } from "./dto/typing.input";
import { ToggleMessageSavedInput } from "./dto/toggle-message-saved.input";
import { RedisService } from "../../redis/redis.service";
import { CacheSqliteService } from "../../sqlite/cache-sqlite.service";

export const messagePubSub = new PubSub();

const messageInclude = {
  sender: true,
  attachments: true,
  reactions: {
    include: {
      user: true,
    },
  },
  replyTo: {
    include: {
      sender: true,
      attachments: true,
      reactions: {
        include: {
          user: true,
        },
      },
    },
  },
  forwardedFrom: {
    include: {
      sender: true,
    },
  },
  savedByIds: true,
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
    private readonly sqliteCache: CacheSqliteService,
  ) {}

  private getVisibleMessageWhere(currentUserId: string, conversationId?: string) {
    return {
      deletedAt: null,
      ...(conversationId ? { conversationId } : {}),
      OR: [
        { expiresAt: { equals: null } },
        { expiresAt: { gt: new Date() } },
        { savedByIds: { has: currentUserId } },
      ],
    };
  }

  private mapMessageForUser<T>(
    message: T,
    currentUserId: string,
  ) {
    const savedByIds = ((message as { savedByIds?: string[] | null }).savedByIds ??
      []) as string[];
    return {
      ...message,
      isSaved: savedByIds.includes(currentUserId),
    };
  }

  async conversationMessages(currentUserId: string, input: ConversationMessagesInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );

    const messages = await this.prisma.message.findMany({
      where: this.getVisibleMessageWhere(currentUserId, input.conversationId),
      orderBy: {
        createdAt: "asc",
      },
      take: input.limit ?? 100,
      include: messageInclude,
    });

    messages.forEach((message: (typeof messages)[number]) => {
      this.sqliteCache.cacheMessage(
        message.id,
        message.conversationId,
        JSON.stringify(message),
      );
    });

    return messages.map((message: (typeof messages)[number]) =>
      this.mapMessageForUser(message, currentUserId),
    );
  }

  async sendMessage(currentUserId: string, input: SendMessageInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );

    if (
      !input.text &&
      !input.emoji &&
      !input.linkUrl &&
      (!input.attachments || input.attachments.length === 0)
    ) {
      throw new BadRequestException("Mensagem vazia.");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: currentUserId,
        kind: input.kind,
        text: input.text,
        emoji: input.emoji,
        linkUrl: input.linkUrl,
        linkTitle: input.linkTitle,
        linkDescription: input.linkDescription,
        replyToId: input.replyToId,
        forwardedFromId: input.forwardedFromId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        savedByIds: [],
        attachments: input.attachments?.length
          ? {
              create: input.attachments.map((attachment) => ({
                ...attachment,
              })),
            }
          : undefined,
      },
      include: messageInclude,
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: message.createdAt,
      },
    });

    await this.redisService.setTyping(input.conversationId, currentUserId, false);
    this.sqliteCache.cacheMessage(
      message.id,
      message.conversationId,
      JSON.stringify(message),
    );

    await messagePubSub.publish("message.added", {
      messageAdded: this.mapMessageForUser(message, currentUserId),
      conversationId: input.conversationId,
    });

    return this.mapMessageForUser(message, currentUserId);
  }

  async reactToMessage(currentUserId: string, input: ReactToMessageInput) {
    const message = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
    });
    await this.conversationsService.assertMembership(
      message.conversationId,
      currentUserId,
    );

    const existing = await this.prisma.reaction.findFirst({
      where: {
        messageId: input.messageId,
        userId: currentUserId,
        emoji: input.emoji,
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.reaction.create({
        data: {
          messageId: input.messageId,
          userId: currentUserId,
          emoji: input.emoji,
        },
      });
    }

    const updated = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
      include: messageInclude,
    });
    return this.mapMessageForUser(updated, currentUserId);
  }

  async toggleMessageSaved(currentUserId: string, input: ToggleMessageSavedInput) {
    const message = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
    });

    await this.conversationsService.assertMembership(
      message.conversationId,
      currentUserId,
    );

    const savedByIds = new Set(message.savedByIds ?? []);
    if (input.saved) {
      savedByIds.add(currentUserId);
    } else {
      savedByIds.delete(currentUserId);
    }

    const updated = await this.prisma.message.update({
      where: { id: input.messageId },
      data: {
        savedByIds: Array.from(savedByIds),
      },
      include: messageInclude,
    });

    this.sqliteCache.cacheMessage(
      updated.id,
      updated.conversationId,
      JSON.stringify(updated),
    );

    return this.mapMessageForUser(updated, currentUserId);
  }

  async setTyping(currentUserId: string, input: TypingInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );
    await this.redisService.setTyping(
      input.conversationId,
      currentUserId,
      input.isTyping,
    );
    return true;
  }

  async typingUsers(currentUserId: string, conversationId: string) {
    await this.conversationsService.assertMembership(conversationId, currentUserId);
    return this.redisService.getTypingUsers(conversationId);
  }
}
