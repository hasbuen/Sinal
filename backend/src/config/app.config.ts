import { tmpdir } from "os";
import { dirname, join } from "path";

function readEnv(name: string, fallback = "") {
  return (process.env[name] || fallback).trim();
}

const storageRoot = process.env.VERCEL
  ? join(tmpdir(), "sinal-storage")
  : join(process.cwd(), "storage");
const port = Number(readEnv("PORT", "4000"));
const nodeEnv = readEnv("NODE_ENV", "development");
const sqlitePath =
  readEnv("SQLITE_CACHE_PATH") || join(storageRoot, "cache.sqlite");
const uploadDir = readEnv("UPLOAD_DIR") || join(storageRoot, "uploads");

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

function parseOrigins(value: string) {
  return value
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const defaultFrontendOrigins =
  nodeEnv === "production"
    ? [
        "https://hasbuen.github.io",
        "https://localhost",
        "http://localhost:3000",
        "http://localhost",
        "capacitor://localhost",
      ]
    : [
        "https://localhost",
        "http://localhost:3000",
        "http://localhost",
        "capacitor://localhost",
      ];

const configuredFrontendOrigins = parseOrigins(
  readEnv("FRONTEND_ORIGIN") || readEnv("APP_ORIGIN"),
);
const frontendOrigins = configuredFrontendOrigins.includes("*")
  ? ["*"]
  : [...new Set([...defaultFrontendOrigins, ...configuredFrontendOrigins])];
const allowAllFrontendOrigins = frontendOrigins.includes("*");
const publicApiOrigin =
  readEnv("PUBLIC_API_ORIGIN") || `http://localhost:${port}`;
const blobReadWriteToken = readEnv("BLOB_READ_WRITE_TOKEN");
const appwriteAdminEmails = parseCsv(readEnv("APPWRITE_ADMIN_EMAILS"));
const defaultAppwriteProjectId = "69d0695b00063d876b0d";

export const appConfig = {
  nodeEnv,
  port,
  databaseUrl: readEnv("DATABASE_URL"),
  jwtSecret: readEnv("JWT_SECRET", "change-me"),
  jwtExpiresIn: readEnv("JWT_EXPIRES_IN", "7d"),
  redisUrl: readEnv("REDIS_URL"),
  sqlitePath,
  sqliteDir: dirname(sqlitePath),
  uploadDir,
  frontendOrigins,
  allowAllFrontendOrigins,
  publicApiOrigin,
  blobReadWriteToken,
  appwrite: {
    endpoint: readEnv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1"),
    projectId: readEnv("APPWRITE_PROJECT_ID", defaultAppwriteProjectId),
    apiKey: readEnv("APPWRITE_API_KEY"),
    databaseId: readEnv("APPWRITE_DATABASE_ID"),
    usersCollectionId: readEnv("APPWRITE_USERS_COLLECTION_ID"),
    messagesCollectionId: readEnv("APPWRITE_MESSAGES_COLLECTION_ID"),
    groupsCollectionId: readEnv("APPWRITE_GROUPS_COLLECTION_ID"),
    mediaBucketId: readEnv("APPWRITE_MEDIA_BUCKET_ID"),
    adminEmails: appwriteAdminEmails,
  },
};
