import { Field, InputType } from "@nestjs/graphql";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  bio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/\S+|data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)$/i, {
    message: "avatarUrl precisa ser uma URL de imagem valida.",
  })
  avatarUrl?: string;
}
