import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { appConfig } from "../config/app.config";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor() {
    this.client = appConfig.redisUrl ? new Redis(appConfig.redisUrl) : null;

    if (this.client) {
      this.client.on("error", (error) => {
        this.logger.warn(`Redis error: ${error.message}`);
      });
    }
  }

  async setPresence(userId: string, payload: string, ttlSeconds = 60) {
    if (!this.client) {
      return;
    }

    await this.client.set(`presence:${userId}`, payload, "EX", ttlSeconds);
  }

  async getPresence(userId: string) {
    if (!this.client) {
      return null;
    }

    return this.client.get(`presence:${userId}`);
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    if (!this.client) {
      return;
    }

    const key = `typing:${conversationId}`;
    if (isTyping) {
      await this.client.sadd(key, userId);
      await this.client.expire(key, 10);
      return;
    }

    await this.client.srem(key, userId);
  }

  async getTypingUsers(conversationId: string) {
    if (!this.client) {
      return [];
    }

    return this.client.smembers(`typing:${conversationId}`);
  }

  async enqueue(queueName: string, payload: Record<string, unknown>) {
    if (!this.client) {
      return;
    }

    await this.client.lpush(`queue:${queueName}`, JSON.stringify(payload));
    await this.client.ltrim(`queue:${queueName}`, 0, 499);
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
