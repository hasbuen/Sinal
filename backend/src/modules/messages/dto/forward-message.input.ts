import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId, IsOptional, IsString } from "class-validator";

@InputType()
export class ForwardMessageInput {
  @Field(() => ID)
  @IsMongoId()
  messageId!: string;

  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
