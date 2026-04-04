import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AppwriteGroupModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => Int)
  total!: number;

  @Field(() => [String])
  roles!: string[];
}
