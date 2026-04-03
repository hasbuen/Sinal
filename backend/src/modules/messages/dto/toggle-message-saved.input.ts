import { Field, ID, InputType } from "@nestjs/graphql";
import { IsBoolean, IsMongoId } from "class-validator";

@InputType()
export class ToggleMessageSavedInput {
  @Field(() => ID)
  @IsMongoId()
  messageId!: string;

  @Field(() => Boolean)
  @IsBoolean()
  saved!: boolean;
}
