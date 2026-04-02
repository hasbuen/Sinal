import { Field, InputType, ID } from "@nestjs/graphql";
import { IsMongoId } from "class-validator";

@InputType()
export class CreateDirectConversationInput {
  @Field(() => ID)
  @IsMongoId()
  userId!: string;
}
