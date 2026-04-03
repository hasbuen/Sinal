import type {
  BackendConversation,
  BackendMessage,
  BackendPresence,
  BackendUser,
} from "@/lib/backend-client";

export const quickReactions = ["👍", "❤️", "😂", "🔥"];
export const quickEmojis = ["😀", "🚀", "🎧", "✨"];

export const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
});

export const isEmojiOnly = (value: string) =>
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\s)+$/u.test(
    value.trim(),
  );

export function inferMessageKind(
  text: string,
  attachments: Array<{ kind: string }>,
) {
  if (attachments.length > 0) {
    const kind = attachments[0]?.kind;
    if (kind === "IMAGE") return "IMAGE" as const;
    if (kind === "AUDIO") return "AUDIO" as const;
    if (kind === "VIDEO") return "VIDEO" as const;
    return "FILE" as const;
  }

  if (/^https?:\/\/\S+$/i.test(text.trim())) return "LINK" as const;
  if (isEmojiOnly(text)) return "EMOJI" as const;
  return "TEXT" as const;
}

export function avatarLabel(name?: string | null) {
  return name?.trim().slice(0, 1).toUpperCase() || "S";
}

export function messagePreview(message?: BackendMessage | null) {
  if (!message) return "Sem mensagens ainda";
  if (message.deletedAt) return "Mensagem apagada";
  if (message.kind === "EMOJI") return message.emoji || "Emoji";
  if (message.attachments[0]) return `📎 ${message.attachments[0].fileName}`;
  return message.text || message.linkUrl || "Nova mensagem";
}

export function conversationName(
  conversation: BackendConversation,
  currentUserId: string,
) {
  if (conversation.kind === "GROUP") return conversation.title || "Grupo";
  return (
    conversation.members.find((member) => member.user.id !== currentUserId)?.user
      .displayName || "Conversa direta"
  );
}

export function getConversationUser(
  conversation: BackendConversation,
  currentUserId: string,
) {
  return conversation.members.find((member) => member.user.id !== currentUserId)
    ?.user;
}

export function timeUntilExpiry(message: BackendMessage, now: number) {
  if (message.isSaved || !message.expiresAt) return null;
  const diff = new Date(message.expiresAt).getTime() - now;
  if (diff <= 0) return "Expirando...";
  const minutes = Math.floor(diff / 60000);
  if (minutes > 0) return `Expira em ${minutes}m`;
  return `Expira em ${Math.floor(diff / 1000)}s`;
}

export function formatPresenceLabel(presence?: BackendPresence | null) {
  if (!presence) return "Offline";
  if (presence.online) return "Online agora";
  if (presence.lastSeenAt) {
    return `Visto por ultimo ${dateTimeFormatter.format(
      new Date(presence.lastSeenAt),
    )}`;
  }
  return "Offline";
}

export function formatTypingLabel(
  typingUsers: BackendUser[],
  fallback: string,
  activePresence?: BackendPresence | null,
) {
  if (typingUsers.length > 0) {
    return `${typingUsers.map((user) => user.displayName).join(", ")} digitando...`;
  }

  return activePresence ? formatPresenceLabel(activePresence) : fallback;
}

export function receiptState(
  message: BackendMessage,
  conversation: BackendConversation,
  currentUserId: string,
) {
  const recipientIds = conversation.members
    .map((member) => member.user.id)
    .filter((id) => id !== currentUserId);

  if (recipientIds.length === 0) return "sent";
  if (recipientIds.every((id) => message.readByIds.includes(id))) return "read";
  if (recipientIds.every((id) => message.deliveredToIds.includes(id))) {
    return "delivered";
  }

  return "sent";
}
