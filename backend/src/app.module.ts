import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLJSON } from "graphql-scalars";
import { Request } from "express";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { CacheSqliteModule } from "./sqlite/cache-sqlite.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { AppwriteModule } from "./appwrite/appwrite.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      useGlobalPrefix: true,
      playground: true,
      subscriptions: {
        "graphql-ws": true,
      },
      resolvers: {
        JSON: GraphQLJSON,
      },
      context: ({
        req,
        extra,
      }: {
        req?: Request;
        extra?: {
          request?: Request;
          connectionParams?: Record<string, unknown>;
        };
      }) => {
        const connectionAuthorization =
          typeof extra?.connectionParams?.Authorization === "string"
            ? extra.connectionParams.Authorization
            : typeof extra?.connectionParams?.authorization === "string"
              ? extra.connectionParams.authorization
              : undefined;

        const request =
          req ??
          extra?.request ??
          ({
            headers: connectionAuthorization
              ? {
                  authorization: connectionAuthorization,
                }
              : {},
          } as Request);

        if (connectionAuthorization && request.headers) {
          request.headers.authorization = connectionAuthorization;
        }

        return {
          req: request,
        };
      },
    }),
    PrismaModule,
    RedisModule,
    CacheSqliteModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    UploadsModule,
    RealtimeModule,
    AppwriteModule,
  ],
})
export class AppModule {}
