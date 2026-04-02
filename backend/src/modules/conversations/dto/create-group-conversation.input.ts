import { Field, InputType, ID } from "@nestjs/graphql";
import { IsArray, IsMongoId, IsOptional, IsString, MinLength } from "class-validator";

@InputType()
export class CreateGroupConversationInput {
  @Field()
  @IsString()
  @MinLength(2)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => [ID])
  @IsArray()
  @IsMongoId({ each: true })
  memberIds!: string[];
}
