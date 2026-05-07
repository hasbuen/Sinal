import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql";
import { PushPlatform } from "@prisma/client";

registerEnumType(PushPlatform, { name: "PushPlatform" });

@ObjectType()
export class PushDeviceModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => PushPlatform)
  platform!: PushPlatform;

  @Field(() => String)
  token!: string;

  @Field(() => String, { nullable: true })
  deviceName?: string | null;

  @Field(() => String, { nullable: true })
  appVersion?: string | null;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date)
  lastSeenAt!: Date;
}
