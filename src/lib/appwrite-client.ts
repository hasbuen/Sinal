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
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || DEFAULT_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const APPWRITE_USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "";
const APPWRITE_MESSAGES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || "";
const APPWRITE_GROUPS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID || "";
const APPWRITE_MEDIA_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID || "";

let clientSingleton: Client | null = null;

export function isAppwriteEnabled() {
  return Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID);
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
  await account.create(ID.unique(), input.email.trim(), input.password, input.name.trim());
  await account.createEmailPasswordSession(input.email.trim(), input.password);
  return account.get();
}

export async function loginWithAppwriteEmailPassword(
  email: string,
  password: string,
) {
  const account = getAppwriteAccount();
  await account.createEmailPasswordSession(email.trim(), password);
  return account.get();
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
