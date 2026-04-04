import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class CreateAppwriteGroupInput {
  @Field()
  name!: string;

  @Field(() => [String], { defaultValue: [] })
  memberUserIds!: string[];
}
