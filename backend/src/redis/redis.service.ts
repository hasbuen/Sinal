import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { appConfig } from "../config/app.config";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private available = false;

  constructor() {
    if (!appConfig.redisUrl) {
      this.client = null;
      this.logger.log("Redis desativado: REDIS_URL ausente.");
      return;
    }

    this.client = new Redis(appConfig.redisUrl, {
      connectTimeout: 5_000,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      retryStrategy: (attempt) => {
        if (attempt > 6) {
          this.logger.warn("Redis excedeu o limite de reconexao. Seguindo em modo degradado.");
          return null;
        }

        return Math.min(attempt * 400, 3_000);
      },
    });

    this.client.on("ready", () => {
      this.available = true;
      this.logger.log("Redis conectado.");
    });

    this.client.on("reconnecting", () => {
      this.available = false;
      this.logger.warn("Redis reconectando...");
    });

    this.client.on("close", () => {
      this.available = false;
      this.logger.warn("Conexao Redis fechada.");
    });

    this.client.on("end", () => {
      this.available = false;
      this.logger.warn("Redis indisponivel.");
    });

    this.client.on("error", (error) => {
      this.available = false;
      this.logger.warn(`Redis error: ${error.message}`);
    });
  }

  private async safe<T>(operation: () => Promise<T>, fallback: T) {
    if (!this.client || !this.available) {
      return fallback;
    }

    try {
      return await operation();
    } catch (error) {
      this.available = false;
      this.logger.warn(
        `Redis degradado: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
      return fallback;
    }
  }

  async setPresence(userId: string, payload: string, ttlSeconds = 60) {
    await this.safe(
      () => this.client!.set(`presence:${userId}`, payload, "EX", ttlSeconds),
      "OK",
    );
  }

  async getPresence(userId: string) {
    return this.safe(() => this.client!.get(`presence:${userId}`), null);
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    if (isTyping) {
      await this.safe(async () => {
        const key = `typing:${conversationId}`;
        await this.client!.sadd(key, userId);
        await this.client!.expire(key, 10);
        return true;
      }, false);
      return;
    }

    await this.safe(
      () => this.client!.srem(`typing:${conversationId}`, userId),
      0,
    );
  }

  async getTypingUsers(conversationId: string) {
    return this.safe(() => this.client!.smembers(`typing:${conversationId}`), []);
  }

  async enqueue(queueName: string, payload: Record<string, unknown>) {
    await this.safe(async () => {
      const key = `queue:${queueName}`;
      await this.client!.lpush(key, JSON.stringify(payload));
      await this.client!.ltrim(key, 0, 499);
      return true;
    }, false);
  }

  async getJson<T>(key: string) {
    const raw = await this.safe(() => this.client!.get(key), null);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, payload: unknown, ttlSeconds = 30) {
    await this.safe(
      () => this.client!.set(key, JSON.stringify(payload), "EX", ttlSeconds),
      "OK",
    );
  }

  async deleteKeys(keys: string[]) {
    if (keys.length === 0) {
      return;
    }

    await this.safe(() => this.client!.del(...keys), 0);
  }

  async onModuleDestroy() {
    this.available = false;
    await this.client?.quit().catch(() => undefined);
  }
}
