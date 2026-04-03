import { Field, ID, InputType } from "@nestjs/graphql";
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";
import { MessageKind } from "../../conversations/models/chat.enums";
import { AttachmentInput } from "./attachment.input";

@InputType()
export class SendMessageInput {
  @Field(() => ID)
  @IsMongoId()
  conversationId!: string;

  @Field(() => MessageKind)
  kind!: MessageKind;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  text?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emoji?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  linkTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  linkDescription?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  replyToId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  forwardedFromId?: string;

  @Field(() => [AttachmentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  attachments?: AttachmentInput[];
}
