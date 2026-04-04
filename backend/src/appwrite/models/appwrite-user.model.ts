import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AppwriteUserModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field()
  status!: boolean;

  @Field()
  emailVerification!: boolean;

  @Field(() => [String])
  labels!: string[];

  @Field(() => String, { nullable: true })
  lastSeenAt?: string | null;
}
