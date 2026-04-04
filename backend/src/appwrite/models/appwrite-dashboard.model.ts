import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AppwriteDashboardModel {
  @Field()
  configured!: boolean;

  @Field(() => Int)
  appwriteUserCount!: number;

  @Field(() => Int)
  appwriteGroupCount!: number;

  @Field()
  mongoEnabled!: boolean;

  @Field()
  redisEnabled!: boolean;

  @Field()
  sqliteEnabled!: boolean;

  @Field(() => [String])
  mirrorCollections!: string[];
}
