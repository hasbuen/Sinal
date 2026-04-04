import { Module } from "@nestjs/common";
import { AppwriteModule } from "../../appwrite/appwrite.module";
import { ConversationsService } from "./conversations.service";
import { ConversationsResolver } from "./conversations.resolver";
import { RealtimeModule } from "../../realtime/realtime.module";

@Module({
  imports: [RealtimeModule, AppwriteModule],
  providers: [ConversationsService, ConversationsResolver],
  exports: [ConversationsService],
})
export class ConversationsModule {}
