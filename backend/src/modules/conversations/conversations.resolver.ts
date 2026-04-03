import { Args, ID, Mutation, Query, Resolver, Subscription } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "../users/models/user.model";
import { ConversationModel } from "./models/conversation.model";
import { ConversationsService } from "./conversations.service";
import { CreateDirectConversationInput } from "./dto/create-direct-conversation.input";
import { CreateGroupConversationInput } from "./dto/create-group-conversation.input";
import { AddMembersInput } from "./dto/add-members.input";
import { MarkReadInput } from "./dto/mark-read.input";
import { PresenceHeartbeatInput } from "./dto/presence-heartbeat.input";
import { UserPresenceModel } from "./models/user-presence.model";
import { presencePubSub } from "../messages/chat.events";

@Resolver(() => ConversationModel)
export class ConversationsResolver {
  constructor(private readonly conversationsService: ConversationsService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [ConversationModel])
  conversations(@CurrentUser() user: UserModel) {
    return this.conversationsService.findForUser(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ConversationModel)
  createDirectConversation(
    @CurrentUser() user: UserModel,
    @Args("input") input: CreateDirectConversationInput,
  ) {
    return this.conversationsService.createDirectConversation(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ConversationModel)
  createGroupConversation(
    @CurrentUser() user: UserModel,
    @Args("input") input: CreateGroupConversationInput,
  ) {
    return this.conversationsService.createGroupConversation(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ConversationModel)
  addConversationMembers(
    @CurrentUser() user: UserModel,
    @Args("input") input: AddMembersInput,
  ) {
    return this.conversationsService.addMembers(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  markConversationRead(
    @CurrentUser() user: UserModel,
    @Args("input") input: MarkReadInput,
  ) {
    return this.conversationsService.markConversationRead(
      user.id,
      input.conversationId,
    );
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserPresenceModel)
  setPresence(
    @CurrentUser() user: UserModel,
    @Args("input") input: PresenceHeartbeatInput,
  ) {
    return this.conversationsService.heartbeat(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [UserPresenceModel])
  conversationPresence(
    @CurrentUser() user: UserModel,
    @Args("conversationId", { type: () => ID }) conversationId: string,
  ) {
    return this.conversationsService.conversationPresence(user.id, conversationId);
  }

  @UseGuards(GqlAuthGuard)
  @Subscription(() => UserPresenceModel, {
    filter: (
      payload: { conversationId: string },
      variables: { conversationId: string },
    ) => payload.conversationId === variables.conversationId,
    resolve: (payload: { presenceChanged: UserPresenceModel }) =>
      payload.presenceChanged,
  })
  presenceChanged(
    @Args("conversationId", { type: () => ID }) _conversationId: string,
  ) {
    return presencePubSub.asyncIterableIterator("presence.changed");
  }
}
