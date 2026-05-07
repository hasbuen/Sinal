import { Field, InputType } from "@nestjs/graphql";
import { PushPlatform } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

@InputType()
export class RegisterPushDeviceInput {
  @Field(() => PushPlatform)
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @Field(() => String)
  @IsString()
  @MinLength(16)
  token!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
