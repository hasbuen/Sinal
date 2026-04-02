import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUrl, Min } from "class-validator";
import { MediaKind } from "../../conversations/models/chat.enums";

@InputType()
export class AttachmentInput {
  @Field(() => MediaKind)
  kind!: MediaKind;

  @Field()
  @IsUrl()
  url!: string;

  @Field()
  @IsString()
  mimeType!: string;

  @Field()
  @IsString()
  fileName!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  width?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  height?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  durationMs?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}
