import { Field, ID, InputType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-scalars";
import { IsMongoId, IsOptional } from "class-validator";
import { CallSignalType } from "../../conversations/models/chat.enums";

@InputType()
export class SendCallSignalInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field(() => CallSignalType)
  type!: CallSignalType;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  targetUserId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: Record<string, unknown> | null;
}
