"use client";

import {
  Account,
  Client,
  Databases,
  ID,
  OAuthProvider,
  Storage,
  Teams,
  type Models,
} from "appwrite";
import { toPublicCallbackHref } from "@/lib/runtime";

const DEFAULT_APPWRITE_PROJECT_ID = "69d0695b00063d876b0d";
const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || DEFAULT_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "sinal";
const APPWRITE_USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "users";
const APPWRITE_MESSAGES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || "messages";
const APPWRITE_GROUPS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID || "groups";
const APPWRITE_MEDIA_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID || "chat-media";
const APPWRITE_GOOGLE_OAUTH_ENABLED =
  process.env.NEXT_PUBLIC_APPWRITE_GOOGLE_OAUTH_ENABLED === "true";

let clientSingleton: Client | null = null;

function readAppwriteErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return null;
}

function isActiveSessionError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("session is active") ||
    normalized.includes("creation of a session is prohibited")
  );
}

export function getFriendlyAppwriteErrorMessage(
  error: unknown,
  fallback = "Nao foi possivel concluir a solicitacao.",
) {
  const message = readAppwriteErrorMessage(error);
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();

  if (isActiveSessionError(message)) {
    return "Voce ja tem uma sessao ativa. Entrando direto no aplicativo.";
  }

  if (
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid `email` or `password`")
  ) {
    return "E-mail ou senha invalidos.";
  }

  if (normalized.includes("already exists")) {
    return "Ja existe uma conta com esse e-mail.";
  }

  if (normalized.includes("invalid email")) {
    return "Digite um e-mail valido.";
  }

  if (normalized.includes("password") && normalized.includes("at least")) {
    return "A senha precisa atender aos requisitos minimos do Appwrite.";
  }

  if (normalized.includes("user") && normalized.includes("unauthorized")) {
    return "Sua sessao expirou. Faca login novamente.";
  }

  if (normalized.includes("too many")) {
    return "Muitas tentativas seguidas. Aguarde um pouco e tente novamente.";
  }

  return message;
}

export function isAppwriteEnabled() {
  return Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);
}

export function isAppwriteGoogleOAuthEnabled() {
  return APPWRITE_GOOGLE_OAUTH_ENABLED;
}

function getAppwriteClient() {
  if (!isAppwriteEnabled()) {
    throw new Error("Appwrite nao configurado no frontend.");
  }

  if (!clientSingleton) {
    clientSingleton = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);
  }

  return clientSingleton;
}

export function getAppwriteAccount() {
  return new Account(getAppwriteClient());
}

export function getAppwriteDatabases() {
  return new Databases(getAppwriteClient());
}

export function getAppwriteStorage() {
  return new Storage(getAppwriteClient());
}

export function getAppwriteTeams() {
  return new Teams(getAppwriteClient());
}

export function getAppwriteConfig() {
  return {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT_ID,
    databaseId: APPWRITE_DATABASE_ID,
    usersCollectionId: APPWRITE_USERS_COLLECTION_ID,
    messagesCollectionId: APPWRITE_MESSAGES_COLLECTION_ID,
    groupsCollectionId: APPWRITE_GROUPS_COLLECTION_ID,
    mediaBucketId: APPWRITE_MEDIA_BUCKET_ID,
  };
}

export async function registerWithAppwriteEmailPassword(input: {
  email: string;
  password: string;
  name: string;
}) {
  const account = getAppwriteAccount();
  try {
    await account.create(ID.unique(), input.email.trim(), input.password, input.name.trim());
    await account.createEmailPasswordSession(input.email.trim(), input.password);
    return account.get();
  } catch (error) {
    throw new Error(
      getFriendlyAppwriteErrorMessage(error, "Nao foi possivel criar a conta."),
    );
  }
}

export async function loginWithAppwriteEmailPassword(
  email: string,
  password: string,
) {
  const account = getAppwriteAccount();
  try {
    await account.createEmailPasswordSession(email.trim(), password);
    return account.get();
  } catch (error) {
    const message = readAppwriteErrorMessage(error);
    if (message && isActiveSessionError(message)) {
      return account.get();
    }

    throw new Error(
      getFriendlyAppwriteErrorMessage(error, "Nao foi possivel entrar agora."),
    );
  }
}

export async function getAppwriteCurrentUser() {
  return getAppwriteAccount().get();
}

export async function createAppwriteJwt(duration = 900) {
  const jwt = await getAppwriteAccount().createJWT(duration);
  return jwt.jwt;
}

export async function logoutAppwrite() {
  if (!isAppwriteEnabled()) {
    return;
  }

  await getAppwriteAccount().deleteSession("current").catch(() => undefined);
}

export function startAppwriteOAuthLogin(provider: OAuthProvider) {
  const account = getAppwriteAccount();
  const success = new URL(
    toPublicCallbackHref("/login"),
    window.location.origin,
  ).toString();
  const failure = new URL(
    toPublicCallbackHref("/login"),
    window.location.origin,
  ).toString();
  account.createOAuth2Session(provider, success, failure);
}

export function subscribeToAppwriteMessages(
  callback: (payload: unknown) => void,
) {
  const { databaseId, messagesCollectionId } = getAppwriteConfig();
  if (!databaseId || !messagesCollectionId) {
    return () => undefined;
  }

  return getAppwriteClient().subscribe(
    `databases.${databaseId}.collections.${messagesCollectionId}.documents`,
    callback,
  );
}

export type AppwriteFrontUser = Models.User<Models.Preferences>;
export { OAuthProvider };
