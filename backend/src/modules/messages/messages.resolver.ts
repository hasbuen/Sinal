import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "../users/models/user.model";
import { MessageModel } from "./models/message.model";
import { MessagesService, messagePubSub } from "./messages.service";
import { SendMessageInput } from "./dto/send-message.input";
import { ReactToMessageInput } from "./dto/react-to-message.input";
import { ConversationMessagesInput } from "./dto/conversation-messages.input";
import { TypingInput } from "./dto/typing.input";

@Resolver(() => MessageModel)
export class MessagesResolver {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [MessageModel])
  conversationMessages(
    @CurrentUser() user: UserModel,
    @Args("input") input: ConversationMessagesInput,
  ) {
    return this.messagesService.conversationMessages(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageModel)
  sendMessage(
    @CurrentUser() user: UserModel,
    @Args("input") input: SendMessageInput,
  ) {
    return this.messagesService.sendMessage(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageModel)
  reactToMessage(
    @CurrentUser() user: UserModel,
    @Args("input") input: ReactToMessageInput,
  ) {
    return this.messagesService.reactToMessage(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  setTyping(
    @CurrentUser() user: UserModel,
    @Args("input") input: TypingInput,
  ) {
    return this.messagesService.setTyping(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [String])
  typingUsers(
    @CurrentUser() user: UserModel,
    @Args("conversationId", { type: () => ID }) conversationId: string,
  ) {
    return this.messagesService.typingUsers(user.id, conversationId);
  }

  @Subscription(() => MessageModel, {
    filter: (
      payload: { conversationId: string },
      variables: { conversationId: string },
    ) => payload.conversationId === variables.conversationId,
    resolve: (payload: { messageAdded: MessageModel }) => payload.messageAdded,
  })
  messageAdded(@Args("conversationId", { type: () => ID }) _conversationId: string) {
    return messagePubSub.asyncIterableIterator("message.added");
  }
}
