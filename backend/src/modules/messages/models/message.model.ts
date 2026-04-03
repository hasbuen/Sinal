import { Field, ID, ObjectType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-scalars";
import { MessageKind } from "../../conversations/models/chat.enums";
import { UserModel } from "../../users/models/user.model";
import { MediaAttachmentModel } from "./media-attachment.model";
import { ReactionModel } from "./reaction.model";

@ObjectType()
export class MessageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => MessageKind)
  kind!: MessageKind;

  @Field(() => String, { nullable: true })
  text?: string | null;

  @Field(() => String, { nullable: true })
  emoji?: string | null;

  @Field(() => String, { nullable: true })
  linkUrl?: string | null;

  @Field(() => String, { nullable: true })
  linkTitle?: string | null;

  @Field(() => String, { nullable: true })
  linkDescription?: string | null;

  @Field(() => UserModel)
  sender!: UserModel;

  @Field(() => MessageModel, { nullable: true })
  replyTo?: MessageModel | null;

  @Field(() => MessageModel, { nullable: true })
  forwardedFrom?: MessageModel | null;

  @Field(() => [MediaAttachmentModel])
  attachments!: MediaAttachmentModel[];

  @Field(() => [ReactionModel])
  reactions!: ReactionModel[];

  @Field(() => Boolean)
  isSaved!: boolean;

  @Field(() => [String])
  deliveredToIds!: string[];

  @Field(() => [String])
  readByIds!: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;

  @Field(() => Date, { nullable: true })
  editedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date | null;
}
