import { Field, Int, ObjectType } from "@nestjs/graphql";
import { MediaKind } from "../../conversations/models/chat.enums";

@ObjectType()
export class UploadResponseModel {
  @Field(() => String, { nullable: true })
  id?: string;

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

  @Field(() => String, { nullable: true })
  thumbnailUrl?: string;
}
