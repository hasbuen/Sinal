import { BadRequestException, Injectable } from "@nestjs/common";
import {
  MediaKind as PrismaMediaKind,
  MessageKind as PrismaMessageKind,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AppwriteService } from "../../appwrite/appwrite.service";
import { ConversationsService } from "../conversations/conversations.service";
import { SendMessageInput } from "./dto/send-message.input";
import { ReactToMessageInput } from "./dto/react-to-message.input";
import { ConversationMessagesInput } from "./dto/conversation-messages.input";
import { TypingInput } from "./dto/typing.input";
import { EditMessageInput } from "./dto/edit-message.input";
import { DeleteMessageInput } from "./dto/delete-message.input";
import { ForwardMessageInput } from "./dto/forward-message.input";
import { SendCallSignalInput } from "./dto/send-call-signal.input";
import { RedisService } from "../../redis/redis.service";
import { CacheSqliteService } from "../../sqlite/cache-sqlite.service";
import {
  CallSignalType,
  MessageEventType,
  MessageKind,
} from "../conversations/models/chat.enums";
import { callPubSub, messagePubSub } from "./chat.events";
import { RealtimeGateway } from "../../realtime/realtime.gateway";

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

type PrismaMessagePayload = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: PrismaMessageKind | MessageKind;
  text?: string | null;
  emoji?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  expiresAt?: Date | null;
  deliveredToIds?: string[] | null;
  readByIds?: string[] | null;
  attachments?: unknown[];
  reactions?: unknown[];
  replyTo?: unknown;
  forwardedFrom?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly redisService: RedisService,
    private readonly sqliteCache: CacheSqliteService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly appwriteService: AppwriteService,
  ) {}

  private toPrismaMessageKind(
    kind?: MessageKind | PrismaMessageKind | string | null,
  ): PrismaMessageKind {
    switch (kind) {
      case MessageKind.IMAGE:
      case PrismaMessageKind.IMAGE:
      case "IMAGE":
        return PrismaMessageKind.IMAGE;
      case MessageKind.AUDIO:
      case PrismaMessageKind.AUDIO:
      case "AUDIO":
        return PrismaMessageKind.AUDIO;
      case MessageKind.VIDEO:
      case PrismaMessageKind.VIDEO:
      case "VIDEO":
        return PrismaMessageKind.VIDEO;
      case MessageKind.FILE:
      case PrismaMessageKind.FILE:
      case "FILE":
        return PrismaMessageKind.FILE;
      case MessageKind.LINK:
      case PrismaMessageKind.LINK:
      case "LINK":
        return PrismaMessageKind.LINK;
      case MessageKind.EMOJI:
      case PrismaMessageKind.EMOJI:
      case "EMOJI":
        return PrismaMessageKind.EMOJI;
      case MessageKind.SYSTEM:
      case PrismaMessageKind.SYSTEM:
      case "SYSTEM":
        return PrismaMessageKind.SYSTEM;
      case MessageKind.TEXT:
      case PrismaMessageKind.TEXT:
      case "TEXT":
      default:
        return PrismaMessageKind.TEXT;
    }
  }

  private toPrismaMediaKind(
    kind?: PrismaMediaKind | string | null,
  ): PrismaMediaKind {
    switch (kind) {
      case PrismaMediaKind.IMAGE:
      case "IMAGE":
        return PrismaMediaKind.IMAGE;
      case PrismaMediaKind.AUDIO:
      case "AUDIO":
        return PrismaMediaKind.AUDIO;
      case PrismaMediaKind.VIDEO:
      case "VIDEO":
        return PrismaMediaKind.VIDEO;
      case PrismaMediaKind.FILE:
      case "FILE":
      default:
        return PrismaMediaKind.FILE;
    }
  }

  private getVisibleMessageWhere(_currentUserId: string, conversationId?: string) {
    return {
      ...(conversationId ? { conversationId } : {}),
      OR: [
        { expiresAt: { equals: null } },
        { expiresAt: { gt: new Date() } },
      ],
    };
  }

  private mapMessageForUser<T extends PrismaMessagePayload>(
    message: T,
    _currentUserId: string,
  ) {
    return {
      ...message,
      isSaved: false,
      deliveredToIds: message.deliveredToIds ?? [],
      readByIds: message.readByIds ?? [],
    };
  }

  private async publishMessageEvent(
    conversationId: string,
    messageId: string,
    event: MessageEventType,
  ) {
    await this.redisService.enqueue("messages", {
      conversationId,
      messageId,
      event,
      createdAt: new Date().toISOString(),
    });
    this.realtimeGateway.emitMessageEvent({
      conversationId,
      messageId,
      event,
    });
    await messagePubSub.publish("message.event", {
      messageEvent: {
        messageId,
        conversationId,
        event,
      },
      conversationId,
    });
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

      await this.publishMessageEvent(
        conversationId,
        message.id,
        MessageEventType.RECEIPT,
      );
    }
  }

  private inferUpdatedKind(
    message: PrismaMessagePayload,
    input: EditMessageInput,
  ): PrismaMessageKind {
    if (message.attachments?.length) {
      return this.toPrismaMessageKind(message.kind);
    }

    if (input.linkUrl) {
      return PrismaMessageKind.LINK;
    }

    if (input.emoji && !input.text) {
      return PrismaMessageKind.EMOJI;
    }

    return PrismaMessageKind.TEXT;
  }

  private normalizeDeletedMessage(currentUserId: string, messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        kind: PrismaMessageKind.SYSTEM,
        text: "Mensagem apagada",
        emoji: null,
        linkUrl: null,
        linkTitle: null,
        linkDescription: null,
        editedAt: new Date(),
        deletedAt: new Date(),
        metadata: {
          action: "deleted",
          deletedById: currentUserId,
        },
        attachments: {
          deleteMany: {},
        },
      },
      include: messageInclude,
    });
  }

  async conversationMessages(currentUserId: string, input: ConversationMessagesInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );
    await this.syncMessageReceipts(currentUserId, input.conversationId, false);

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
      this.mapMessageForUser(message as PrismaMessagePayload, currentUserId),
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
        kind: this.toPrismaMessageKind(input.kind),
        text: input.text,
        emoji: input.emoji,
        linkUrl: input.linkUrl,
        linkTitle: input.linkTitle,
        linkDescription: input.linkDescription,
        replyToId: input.replyToId,
        forwardedFromId: input.forwardedFromId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        savedByIds: [],
        deliveredToIds: [currentUserId],
        readByIds: [currentUserId],
        attachments: input.attachments?.length
          ? {
              create: input.attachments.map((attachment) => ({
                kind: this.toPrismaMediaKind(attachment.kind),
                url: attachment.url,
                mimeType: attachment.mimeType,
                fileName: attachment.fileName,
                sizeBytes: attachment.sizeBytes,
                width: attachment.width,
                height: attachment.height,
                durationMs: attachment.durationMs,
                thumbnailUrl: attachment.thumbnailUrl,
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
    await this.appwriteService.syncMessageMirror(message);

    await this.publishMessageEvent(
      input.conversationId,
      message.id,
      MessageEventType.ADDED,
    );

    return this.mapMessageForUser(message as PrismaMessagePayload, currentUserId);
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
    await this.appwriteService.syncMessageMirror(updated);

    await this.publishMessageEvent(
      message.conversationId,
      message.id,
      MessageEventType.UPDATED,
    );

    return this.mapMessageForUser(updated as PrismaMessagePayload, currentUserId);
  }

  async editMessage(currentUserId: string, input: EditMessageInput) {
    const message = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
      include: messageInclude,
    });

    await this.conversationsService.assertMembership(
      message.conversationId,
      currentUserId,
    );

    if (message.senderId !== currentUserId) {
      throw new BadRequestException("Somente o remetente pode editar.");
    }

    if (message.deletedAt) {
      throw new BadRequestException("Nao e possivel editar uma mensagem apagada.");
    }

    const updated = await this.prisma.message.update({
      where: { id: input.messageId },
      data: {
        kind: this.inferUpdatedKind(message as PrismaMessagePayload, input),
        text: input.text ?? null,
        emoji: input.emoji ?? null,
        linkUrl: input.linkUrl ?? null,
        linkTitle: input.linkTitle ?? null,
        linkDescription: input.linkDescription ?? null,
        editedAt: new Date(),
      },
      include: messageInclude,
    });
    await this.appwriteService.syncMessageMirror(updated);

    await this.publishMessageEvent(
      message.conversationId,
      message.id,
      MessageEventType.UPDATED,
    );

    return this.mapMessageForUser(updated as PrismaMessagePayload, currentUserId);
  }

  async deleteMessage(currentUserId: string, input: DeleteMessageInput) {
    const message = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
    });

    await this.conversationsService.assertMembership(
      message.conversationId,
      currentUserId,
    );

    if (message.senderId !== currentUserId) {
      throw new BadRequestException("Somente o remetente pode apagar.");
    }

    const updated = await this.normalizeDeletedMessage(currentUserId, message.id);
    await this.appwriteService.syncMessageMirror(updated);
    await this.publishMessageEvent(
      message.conversationId,
      message.id,
      MessageEventType.DELETED,
    );

    return this.mapMessageForUser(updated as PrismaMessagePayload, currentUserId);
  }

  async forwardMessage(currentUserId: string, input: ForwardMessageInput) {
    const source = await this.prisma.message.findUniqueOrThrow({
      where: { id: input.messageId },
      include: messageInclude,
    });

    await this.conversationsService.assertMembership(
      source.conversationId,
      currentUserId,
    );
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );

    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: currentUserId,
        kind: this.toPrismaMessageKind(source.kind),
        text: input.note
          ? `${input.note}\n\n${source.text ?? ""}`.trim()
          : source.text,
        emoji: source.emoji,
        linkUrl: source.linkUrl,
        linkTitle: source.linkTitle,
        linkDescription: source.linkDescription,
        forwardedFromId: source.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        savedByIds: [],
        deliveredToIds: [currentUserId],
        readByIds: [currentUserId],
        metadata: {
          forwarded: true,
        },
        attachments: source.attachments.length
          ? {
              create: source.attachments.map((attachment) => ({
                kind: this.toPrismaMediaKind(attachment.kind),
                url: attachment.url,
                mimeType: attachment.mimeType,
                fileName: attachment.fileName,
                sizeBytes: attachment.sizeBytes,
                width: attachment.width,
                height: attachment.height,
                durationMs: attachment.durationMs,
                thumbnailUrl: attachment.thumbnailUrl,
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
    await this.appwriteService.syncMessageMirror(message);

    await this.publishMessageEvent(
      input.conversationId,
      message.id,
      MessageEventType.ADDED,
    );

    return this.mapMessageForUser(message as PrismaMessagePayload, currentUserId);
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

  async sendCallSignal(currentUserId: string, input: SendCallSignalInput) {
    await this.conversationsService.assertMembership(
      input.conversationId,
      currentUserId,
    );

    if (input.targetUserId) {
      await this.conversationsService.assertMembership(
        input.conversationId,
        input.targetUserId,
      );
    }

    const payload = {
      conversationId: input.conversationId,
      senderId: currentUserId,
      targetUserId: input.targetUserId ?? null,
      type: input.type,
      payload: input.payload ?? null,
      createdAt: new Date(),
    };

    await this.redisService.enqueue("calls", {
      ...payload,
      createdAt: payload.createdAt.toISOString(),
    });
    this.realtimeGateway.emitCallSignal(payload);

    await callPubSub.publish("call.signal", {
      callSignal: payload,
      conversationId: input.conversationId,
      targetUserId: input.targetUserId ?? null,
    });

    if (input.type === CallSignalType.ENDED || input.type === CallSignalType.DECLINED) {
      await this.redisService.setTyping(input.conversationId, currentUserId, false);
    }

    return payload;
  }
}
