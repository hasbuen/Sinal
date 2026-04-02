import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId, IsString } from "class-validator";

@InputType()
export class ReactToMessageInput {
  @Field(() => ID)
  @IsMongoId()
  messageId!: string;

  @Field()
  @IsString()
  emoji!: string;
}
