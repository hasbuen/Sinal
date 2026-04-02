import { Field, Int, ObjectType } from "@nestjs/graphql";
import { MediaKind } from "../../conversations/models/chat.enums";

@ObjectType()
export class UploadResponseModel {
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
}
