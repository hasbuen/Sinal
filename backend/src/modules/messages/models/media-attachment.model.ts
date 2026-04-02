import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { MediaKind } from "../../conversations/models/chat.enums";

@ObjectType()
export class MediaAttachmentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => MediaKind)
  kind!: MediaKind;

  @Field()
  url!: string;

  @Field()
  mimeType!: string;

  @Field()
  fileName!: string;

  @Field(() => Int)
  sizeBytes!: number;

  @Field(() => Int, { nullable: true })
  width?: number | null;

  @Field(() => Int, { nullable: true })
  height?: number | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;

  @Field({ nullable: true })
  thumbnailUrl?: string | null;
}
