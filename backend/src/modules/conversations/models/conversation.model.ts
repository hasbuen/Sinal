import { Field, ID, ObjectType } from "@nestjs/graphql";
import { ConversationKind } from "./chat.enums";
import { ConversationMemberModel } from "./conversation-member.model";
import { MessageModel } from "../../messages/models/message.model";

@ObjectType()
export class ConversationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ConversationKind)
  kind!: ConversationKind;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => [ConversationMemberModel])
  members!: ConversationMemberModel[];

  @Field(() => MessageModel, { nullable: true })
  latestMessage?: MessageModel | null;

  @Field(() => Date, { nullable: true })
  lastMessageAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
