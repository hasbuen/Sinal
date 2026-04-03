import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId } from "class-validator";

@InputType()
export class DeleteMessageInput {
  @Field(() => ID)
  @IsMongoId()
  messageId!: string;
}
