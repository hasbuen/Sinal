import { Injectable } from "@nestjs/common";
import Database from "better-sqlite3";
import { appConfig } from "../config/app.config";

@Injectable()
export class CacheSqliteService {
  private readonly db: Database.Database;

  constructor() {
    this.db = new Database(appConfig.sqlitePath);
    this.bootstrap();
  }

  private bootstrap() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_cache (
        message_id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversation_snapshot (
        conversation_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  cacheMessage(messageId: string, conversationId: string, payload: string) {
    this.db
      .prepare(
        `
          INSERT INTO message_cache (message_id, conversation_id, payload, created_at)
          VALUES (@messageId, @conversationId, @payload, @createdAt)
          ON CONFLICT(message_id) DO UPDATE SET
            payload = excluded.payload,
            created_at = excluded.created_at
        `,
      )
      .run({
        messageId,
        conversationId,
        payload,
        createdAt: new Date().toISOString(),
      });
  }

  cacheConversation(conversationId: string, payload: string) {
    this.db
      .prepare(
        `
          INSERT INTO conversation_snapshot (conversation_id, payload, updated_at)
          VALUES (@conversationId, @payload, @updatedAt)
          ON CONFLICT(conversation_id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at
        `,
      )
      .run({
        conversationId,
        payload,
        updatedAt: new Date().toISOString(),
      });
  }
}
