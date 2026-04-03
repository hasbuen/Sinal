import { Field, ID, InputType } from "@nestjs/graphql";
import { IsMongoId, IsOptional } from "class-validator";

@InputType()
export class PresenceHeartbeatInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  activeConversationId?: string;
}
