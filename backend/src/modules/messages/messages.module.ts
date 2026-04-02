import { Module } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { MessagesResolver } from "./messages.resolver";
import { ConversationsModule } from "../conversations/conversations.module";

@Module({
  imports: [ConversationsModule],
  providers: [MessagesService, MessagesResolver],
  exports: [MessagesService],
})
export class MessagesModule {}
