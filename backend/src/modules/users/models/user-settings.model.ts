import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserSettingsModel {
  @Field(() => String)
  theme!: string;

  @Field(() => String)
  accentTone!: string;

  @Field(() => String)
  wallpaper!: string;

  @Field(() => Boolean)
  compactMode!: boolean;

  @Field(() => Boolean)
  enterToSend!: boolean;

  @Field(() => Boolean)
  autoDownloadMedia!: boolean;

  @Field(() => Boolean)
  readReceipts!: boolean;

  @Field(() => Boolean)
  soundEnabled!: boolean;

  @Field(() => Boolean)
  desktopNotifications!: boolean;

  @Field(() => Boolean)
  messagePreview!: boolean;
}
