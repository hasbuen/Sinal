"use client";

const LOCAL_BACKEND_ORIGIN = "http://localhost:4000";
const PRODUCTION_BACKEND_ORIGIN = "https://sinal-production.up.railway.app";

function isLocalRuntime() {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV !== "production";
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  (isLocalRuntime() ? LOCAL_BACKEND_ORIGIN : PRODUCTION_BACKEND_ORIGIN);
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || `${BACKEND_ORIGIN}/api/graphql`;
const TOKEN_KEY = "sinal-access-token";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export type BackendUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
};

export type BackendConversationMember = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  lastReadAt?: string | null;
  user: BackendUser;
};

export type BackendAttachment = {
  id?: string;
  kind: "IMAGE" | "AUDIO" | "VIDEO" | "FILE";
  url: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  thumbnailUrl?: string | null;
};

export type BackendReaction = {
  id: string;
  emoji: string;
  user: BackendUser;
};

export type BackendMessage = {
  id: string;
  kind:
    | "TEXT"
    | "IMAGE"
    | "AUDIO"
    | "VIDEO"
    | "FILE"
    | "LINK"
    | "EMOJI"
    | "SYSTEM";
  text?: string | null;
  emoji?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  sender: BackendUser;
  replyTo?: BackendMessage | null;
  forwardedFrom?: BackendMessage | null;
  attachments: BackendAttachment[];
  reactions: BackendReaction[];
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
};

export type BackendConversation = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  members: BackendConversationMember[];
  latestMessage?: BackendMessage | null;
  lastMessageAt?: string | null;
};

const messageFields = `
  id
  kind
  text
  emoji
  linkUrl
  linkTitle
  linkDescription
  createdAt
  updatedAt
  expiresAt
  isSaved
  editedAt
  deletedAt
  sender {
    id
    email
    username
    displayName
    avatarUrl
    bio
  }
  attachments {
    id
    kind
    url
    mimeType
    fileName
    sizeBytes
    width
    height
    durationMs
    thumbnailUrl
  }
  reactions {
    id
    emoji
    user {
      id
      email
      username
      displayName
      avatarUrl
      bio
    }
  }
`;

const conversationFields = `
  id
  kind
  title
  description
  avatarUrl
  lastMessageAt
  members {
    id
    role
    joinedAt
    lastReadAt
    user {
      id
      email
      username
      displayName
      avatarUrl
      bio
    }
  }
  latestMessage {
    ${messageFields}
  }
`;

export function getBackendToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setBackendToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearBackendToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

export function resolveBackendAssetUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${BACKEND_ORIGIN}${url}`;
  }

  return `${BACKEND_ORIGIN}/${url}`;
}

export async function gqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getBackendToken()
        ? { Authorization: `Bearer ${getBackendToken()}` }
        : {}),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const payload = (await response.json()) as GraphQLResponse<TData>;

  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || "GraphQL request failed.");
  }

  if (!payload.data) {
    throw new Error("Resposta GraphQL sem dados.");
  }

  return payload.data;
}

export async function loginUser(email: string, password: string) {
  const data = await gqlRequest<{
    login: { accessToken: string; user: BackendUser };
  }>(
    `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          user {
            id
            email
            username
            displayName
            avatarUrl
            bio
          }
        }
      }
    `,
    {
      input: {
        email,
        password,
      },
    },
  );

  return data.login;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  username: string;
}) {
  const data = await gqlRequest<{
    register: { accessToken: string; user: BackendUser };
  }>(
    `
      mutation Register($input: RegisterInput!) {
        register(input: $input) {
          accessToken
          user {
            id
            email
            username
            displayName
            avatarUrl
            bio
          }
        }
      }
    `,
    { input },
  );

  return data.register;
}

export async function getCurrentUser() {
  const data = await gqlRequest<{ me: BackendUser }>(`
    query Me {
      me {
        id
        email
        username
        displayName
        avatarUrl
        bio
      }
    }
  `);

  return data.me;
}

export async function getUsers(term?: string) {
  const data = await gqlRequest<{ users: BackendUser[] }>(
    `
      query Users($input: UserSearchInput) {
        users(input: $input) {
          id
          email
          username
          displayName
          avatarUrl
          bio
        }
      }
    `,
    term ? { input: { term } } : undefined,
  );

  return data.users;
}

export async function getConversations() {
  const data = await gqlRequest<{ conversations: BackendConversation[] }>(`
    query Conversations {
      conversations {
        ${conversationFields}
      }
    }
  `);

  return data.conversations;
}

export async function createDirectConversation(userId: string) {
  const data = await gqlRequest<{ createDirectConversation: BackendConversation }>(
    `
      mutation CreateDirectConversation($input: CreateDirectConversationInput!) {
        createDirectConversation(input: $input) {
          ${conversationFields}
        }
      }
    `,
    {
      input: {
        userId,
      },
    },
  );

  return data.createDirectConversation;
}

export async function createGroupConversation(input: {
  title: string;
  description?: string;
  memberIds: string[];
}) {
  const data = await gqlRequest<{ createGroupConversation: BackendConversation }>(
    `
      mutation CreateGroupConversation($input: CreateGroupConversationInput!) {
        createGroupConversation(input: $input) {
          ${conversationFields}
        }
      }
    `,
    { input },
  );

  return data.createGroupConversation;
}

export async function markConversationRead(conversationId: string) {
  await gqlRequest<{ markConversationRead: boolean }>(
    `
      mutation MarkConversationRead($input: MarkReadInput!) {
        markConversationRead(input: $input)
      }
    `,
    {
      input: {
        conversationId,
      },
    },
  );
}

export async function getConversationMessages(conversationId: string, limit = 100) {
  const data = await gqlRequest<{ conversationMessages: BackendMessage[] }>(
    `
      query ConversationMessages($input: ConversationMessagesInput!) {
        conversationMessages(input: $input) {
          ${messageFields}
        }
      }
    `,
    {
      input: {
        conversationId,
        limit,
      },
    },
  );

  return data.conversationMessages;
}

export async function sendMessage(input: {
  conversationId: string;
  kind: BackendMessage["kind"];
  text?: string;
  emoji?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  replyToId?: string;
  forwardedFromId?: string;
  attachments?: BackendAttachment[];
}) {
  const data = await gqlRequest<{ sendMessage: BackendMessage }>(
    `
      mutation SendMessage($input: SendMessageInput!) {
        sendMessage(input: $input) {
          ${messageFields}
        }
      }
    `,
    { input },
  );

  return data.sendMessage;
}

export async function reactToMessage(messageId: string, emoji: string) {
  const data = await gqlRequest<{ reactToMessage: BackendMessage }>(
    `
      mutation ReactToMessage($input: ReactToMessageInput!) {
        reactToMessage(input: $input) {
          ${messageFields}
        }
      }
    `,
    {
      input: {
        messageId,
        emoji,
      },
    },
  );

  return data.reactToMessage;
}

export async function toggleMessageSaved(messageId: string, saved: boolean) {
  const data = await gqlRequest<{ toggleMessageSaved: BackendMessage }>(
    `
      mutation ToggleMessageSaved($input: ToggleMessageSavedInput!) {
        toggleMessageSaved(input: $input) {
          ${messageFields}
        }
      }
    `,
    {
      input: {
        messageId,
        saved,
      },
    },
  );

  return data.toggleMessageSaved;
}

export async function setTypingStatus(
  conversationId: string,
  isTyping: boolean,
) {
  await gqlRequest<{ setTyping: boolean }>(
    `
      mutation SetTyping($input: TypingInput!) {
        setTyping(input: $input)
      }
    `,
    {
      input: {
        conversationId,
        isTyping,
      },
    },
  );
}

export async function getTypingUsers(conversationId: string) {
  const data = await gqlRequest<{ typingUsers: string[] }>(
    `
      query TypingUsers($conversationId: ID!) {
        typingUsers(conversationId: $conversationId)
      }
    `,
    { conversationId },
  );

  return data.typingUsers;
}

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_ORIGIN}/api/uploads`, {
    method: "POST",
    headers: {
      ...(getBackendToken()
        ? { Authorization: `Bearer ${getBackendToken()}` }
        : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Falha no upload de midia.");
  }

  return (await response.json()) as BackendAttachment;
}

export async function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  const data = await gqlRequest<{ updateProfile: BackendUser }>(
    `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          id
          email
          username
          displayName
          avatarUrl
          bio
        }
      }
    `,
    { input },
  );

  return data.updateProfile;
}
