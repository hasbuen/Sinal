import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { MediaKind } from "../../conversations/models/chat.enums";

@ObjectType()
export class MediaAttachmentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => MediaKind)
  kind!: MediaKind;

  @Field(() => String)
  url!: string;

  @Field(() => String)
  mimeType!: string;

  @Field(() => String)
  fileName!: string;

  @Field(() => Int)
  sizeBytes!: number;

  @Field(() => Int, { nullable: true })
  width?: number | null;

  @Field(() => Int, { nullable: true })
  height?: number | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;

  @Field(() => String, { nullable: true })
  thumbnailUrl?: string | null;
}
