import { Field, ID, ObjectType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-scalars";
import { CallSignalType } from "../../conversations/models/chat.enums";

@ObjectType()
export class CallSignalModel {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => ID)
  senderId!: string;

  @Field(() => ID, { nullable: true })
  targetUserId?: string | null;

  @Field(() => CallSignalType)
  type!: CallSignalType;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: Record<string, unknown> | null;

  @Field(() => Date)
  createdAt!: Date;
}
