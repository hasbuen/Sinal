import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.ensureMessageExpiryIndex();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }

  private async ensureMessageExpiryIndex() {
    await this.$runCommandRaw({
      createIndexes: "Message",
      indexes: [
        {
          key: { expiresAt: 1 },
          name: "Message_expiresAt_ttl",
          expireAfterSeconds: 0,
          partialFilterExpression: {
            expiresAt: {
              $type: "date",
            },
          },
        },
      ],
    });
  }
}
