import { Field, ID, InputType } from "@nestjs/graphql";
import { IsArray, IsMongoId } from "class-validator";

@InputType()
export class AddMembersInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field(() => [ID])
  @IsArray()
  @IsMongoId({ each: true })
  memberIds!: string[];
}
