import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserPresenceModel {
  @Field(() => ID)
  userId!: string;

  @Field()
  online!: boolean;

  @Field(() => Date, { nullable: true })
  lastSeenAt?: Date | null;

  @Field(() => ID, { nullable: true })
  activeConversationId?: string | null;
}
