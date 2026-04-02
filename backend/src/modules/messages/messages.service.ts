import { BadRequestException, Injectable } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { PrismaService } from "../../prisma/prisma.service";
import { ConversationsService } from "../conversations/conversations.service";
import { SendMessageInput } from "./dto/send-message.input";
import { ReactToMessageInput } from "./dto/react-to-message.input";
import { ConversationMessagesInput } from "./dto/conversation-messages.input";
import { TypingInput } from "./dto/typing.input";
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
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
    private readonly sqliteCache: CacheSqliteService,
  ) {}

  async conversationMessages(currentUserId: string, input: ConversationMessagesInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
      },
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

    return messages;
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
      messageAdded: message,
      conversationId: input.conversationId,
    });

    return message;
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

    return this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
      include: messageInclude,
    });
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
