import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class UserSearchInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  term?: string;
}
