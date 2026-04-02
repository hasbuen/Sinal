import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
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
}
