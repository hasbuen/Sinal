import { Field, ID, ObjectType } from "@nestjs/graphql";
import { ConversationRole } from "./chat.enums";
import { UserModel } from "../../users/models/user.model";

@ObjectType()
export class ConversationMemberModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ConversationRole)
  role!: ConversationRole;

  @Field(() => UserModel)
  user!: UserModel;

  @Field()
  joinedAt!: Date;

  @Field({ nullable: true })
  lastReadAt?: Date | null;
}
