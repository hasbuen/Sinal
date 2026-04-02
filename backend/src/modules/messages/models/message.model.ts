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

  @Field({ nullable: true })
  text?: string | null;

  @Field({ nullable: true })
  emoji?: string | null;

  @Field({ nullable: true })
  linkUrl?: string | null;

  @Field({ nullable: true })
  linkTitle?: string | null;

  @Field({ nullable: true })
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

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  editedAt?: Date | null;

  @Field({ nullable: true })
  deletedAt?: Date | null;
}
