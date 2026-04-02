import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId } from "class-validator";

@InputType()
export class MarkReadInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;
}
