import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { json, static as serveStatic, urlencoded } from "express";
import { mkdirSync } from "fs";
import { AppModule } from "./app.module";
import { appConfig } from "./config/app.config";

async function bootstrap() {
  mkdirSync(appConfig.uploadDir, { recursive: true });
  mkdirSync(appConfig.sqliteDir, { recursive: true });

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        if (
          appConfig.allowAllFrontendOrigins ||
          !origin ||
          appConfig.frontendOrigins.includes(origin)
        ) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} nao autorizada.`), false);
      },
      credentials: true,
    },
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
