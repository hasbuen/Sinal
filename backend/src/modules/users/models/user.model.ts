import { Field, ID, ObjectType } from "@nestjs/graphql";
import { UserSettingsModel } from "./user-settings.model";

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  username!: string;

  @Field()
  displayName!: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => UserSettingsModel)
  settings!: UserSettingsModel;

  @Field(() => Date, { nullable: true })
  lastSeenAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
