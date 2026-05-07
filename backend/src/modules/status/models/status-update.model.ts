import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { StatusKind } from "@prisma/client";
import { UserModel } from "../../users/models/user.model";

registerEnumType(StatusKind, { name: "StatusKind" });

@ObjectType()
export class StatusUpdateModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  authorId!: string;

  @Field(() => UserModel)
  author!: UserModel;

  @Field(() => StatusKind)
  kind!: StatusKind;

  @Field(() => String, { nullable: true })
  text?: string | null;

  @Field(() => String, { nullable: true })
  mediaUrl?: string | null;

  @Field(() => String, { nullable: true })
  thumbnailUrl?: string | null;

  @Field(() => String, { nullable: true })
  background?: string | null;

  @Field(() => String, { nullable: true })
  mimeType?: string | null;

  @Field(() => Int, { nullable: true })
  sizeBytes?: number | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;

  @Field(() => [ID])
  viewIds!: string[];

  @Field(() => Boolean)
  viewedByMe!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  expiresAt!: Date;
}
