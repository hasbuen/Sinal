import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  username!: string;

  @Field()
  displayName!: string;

  @Field({ nullable: true })
  avatarUrl?: string | null;

  @Field({ nullable: true })
  bio?: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
