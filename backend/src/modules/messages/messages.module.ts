import { Module } from "@nestjs/common";
import { AppwriteModule } from "../../appwrite/appwrite.module";
import { MessagesService } from "./messages.service";
import { MessagesResolver } from "./messages.resolver";
import { ConversationsModule } from "../conversations/conversations.module";
import { RealtimeModule } from "../../realtime/realtime.module";

@Module({
  imports: [ConversationsModule, RealtimeModule, AppwriteModule],
  providers: [MessagesService, MessagesResolver],
  exports: [MessagesService],
})
export class MessagesModule {}
