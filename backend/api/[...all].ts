import { createHttpServer } from "../src/server";
import type { Express } from "express";

let cachedHandler: Express | null = null;

async function getHandler() {
  if (!cachedHandler) {
    cachedHandler = await createHttpServer();
  }

  return cachedHandler;
}

export default async function handler(req: unknown, res: unknown) {
  const app = await getHandler();
  return app(req as never, res as never);
}
