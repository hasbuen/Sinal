import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsMongoId, IsOptional, Min } from "class-validator";

@InputType()
export class ConversationMessagesInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
