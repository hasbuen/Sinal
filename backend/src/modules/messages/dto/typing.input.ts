import { Field, ID, InputType } from "@nestjs/graphql";
import { IsBoolean, IsMongoId } from "class-validator";

@InputType()
export class TypingInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field()
  @IsBoolean()
  isTyping!: boolean;
}
