import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, {
  json,
  static as serveStatic,
  urlencoded,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { mkdirSync } from "fs";
import { AppModule } from "./app.module";
import { appConfig } from "./config/app.config";

function isAllowedOrigin(origin?: string) {
  return (
    appConfig.allowAllFrontendOrigins ||
    !origin ||
    appConfig.frontendOrigins.includes(origin)
  );
}

function applyCorsHeaders(origin: string | undefined, response: Response) {
  if (!origin) {
    return;
  }

  response.header("Vary", "Origin");
  response.header("Access-Control-Allow-Origin", origin);
  response.header("Access-Control-Allow-Credentials", "true");
  response.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function configureApp(app: INestApplication) {
  app.use((request: Request, response: Response, next: NextFunction) => {
    const origin = request.headers.origin;

    if (!isAllowedOrigin(origin)) {
      next();
      return;
    }

    applyCorsHeaders(origin, response);

    if (request.method === "OPTIONS") {
      response.status(204).send();
      return;
    }

    next();
  });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (appConfig.nodeEnv !== "development") {
      response.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    if (request.secure || request.headers["x-forwarded-proto"] === "https") {
      response.header("X-Forwarded-Proto", "https");
    }

    next();
  });
  app.use(json({ limit: "25mb" }));
  app.use(urlencoded({ extended: true, limit: "25mb" }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  app.setGlobalPrefix("api");
  app.use("/uploads", serveStatic(appConfig.uploadDir));
}

export async function createHttpServer() {
  mkdirSync(appConfig.uploadDir, { recursive: true });
  mkdirSync(appConfig.sqliteDir, { recursive: true });

  const server: Express = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} nao autorizada.`), false);
      },
      credentials: true,
    },
  });

  await configureApp(app);
  app.enableShutdownHooks();
  await app.init();

  return server;
}
