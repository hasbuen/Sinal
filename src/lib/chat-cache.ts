import type {
  BackendConversation,
  BackendMessage,
  BackendUser,
} from "./backend-client";

type BootstrapCache = {
  users: BackendUser[];
  conversations: BackendConversation[];
  cachedAt: number;
};

type MessageCache = {
  messages: BackendMessage[];
  cachedAt: number;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readBootstrapCache(userId: string) {
  return readJson<BootstrapCache>(`sinal-chat-bootstrap:${userId}`);
}

export function writeBootstrapCache(
  userId: string,
  payload: Pick<BootstrapCache, "users" | "conversations">,
) {
  writeJson(`sinal-chat-bootstrap:${userId}`, {
    ...payload,
    cachedAt: Date.now(),
  });
}

export function readMessagesCache(conversationId: string) {
  return readJson<MessageCache>(`sinal-chat-messages:${conversationId}`);
}

export function writeMessagesCache(
  conversationId: string,
  messages: BackendMessage[],
) {
  writeJson(`sinal-chat-messages:${conversationId}`, {
    messages,
    cachedAt: Date.now(),
  });
}
