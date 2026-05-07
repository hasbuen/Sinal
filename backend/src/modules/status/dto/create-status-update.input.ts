import { Field, InputType, Int } from "@nestjs/graphql";
import { StatusKind } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";

@InputType()
export class CreateStatusUpdateInput {
  @Field(() => StatusKind)
  @IsEnum(StatusKind)
  kind!: StatusKind;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  text?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  background?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  ttlSeconds?: number;
}
