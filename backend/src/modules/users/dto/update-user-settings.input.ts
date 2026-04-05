import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

@InputType()
export class UpdateUserSettingsInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(["system", "light", "dark"])
  theme?: "system" | "light" | "dark";

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(["ocean", "ember", "forest"])
  accentTone?: "ocean" | "ember" | "forest";

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(["aurora", "graphite", "sand", "none"])
  wallpaper?: "aurora" | "graphite" | "sand" | "none";

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enterToSend?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  autoDownloadMedia?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  readReceipts?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  messagePreview?: boolean;
}
