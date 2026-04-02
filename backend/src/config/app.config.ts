import { dirname, join } from "path";

const storageRoot = join(process.cwd(), "storage");
const port = Number(process.env.PORT || 4000);
const sqlitePath =
  process.env.SQLITE_CACHE_PATH || join(storageRoot, "cache.sqlite");
const uploadDir = process.env.UPLOAD_DIR || join(storageRoot, "uploads");
const frontendOrigins = (
  process.env.FRONTEND_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllFrontendOrigins = frontendOrigins.includes("*");
const publicApiOrigin =
  process.env.PUBLIC_API_ORIGIN || `http://localhost:${port}`;

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  redisUrl: process.env.REDIS_URL || "",
  sqlitePath,
  sqliteDir: dirname(sqlitePath),
  uploadDir,
  frontendOrigins,
  allowAllFrontendOrigins,
  publicApiOrigin,
};
