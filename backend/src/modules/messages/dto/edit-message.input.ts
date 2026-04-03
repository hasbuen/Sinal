import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId, IsOptional, IsString, IsUrl } from "class-validator";

@InputType()
export class EditMessageInput {
  @Field(() => ID)
  @IsMongoId()
  messageId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  text?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emoji?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  linkTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  linkDescription?: string;
}
