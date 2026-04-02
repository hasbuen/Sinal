import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength, Matches } from "class-validator";

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(3)
  displayName!: string;

  @Field()
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/i)
  username!: string;

  @Field()
  @IsString()
  @MinLength(6)
  password!: string;
}
