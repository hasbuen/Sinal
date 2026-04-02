import { Field, ID, ObjectType } from "@nestjs/graphql";
import { UserModel } from "../../users/models/user.model";

@ObjectType()
export class ReactionModel {
  @Field(() => ID)
  id!: string;

  @Field()
  emoji!: string;

  @Field(() => UserModel)
  user!: UserModel;

  @Field()
  createdAt!: Date;
}
