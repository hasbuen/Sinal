import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { json, static as serveStatic, urlencoded, type Request, type Response, type NextFunction } from "express";
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

async function bootstrap() {
  mkdirSync(appConfig.uploadDir, { recursive: true });
  mkdirSync(appConfig.sqliteDir, { recursive: true });

  const app = await NestFactory.create(AppModule, {
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
  app.enableShutdownHooks();

  await app.listen(appConfig.port, "0.0.0.0");
}

void bootstrap();
