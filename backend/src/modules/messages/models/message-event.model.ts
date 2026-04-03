import { Field, ID, ObjectType } from "@nestjs/graphql";
import { MessageEventType } from "../../conversations/models/chat.enums";

@ObjectType()
export class MessageEventModel {
  @Field(() => ID)
  messageId!: string;

  @Field(() => ID)
  conversationId!: string;

  @Field(() => MessageEventType)
  event!: MessageEventType;
}
