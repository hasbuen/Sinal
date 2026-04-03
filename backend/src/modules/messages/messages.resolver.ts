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
import { MessagesService } from "./messages.service";
import { SendMessageInput } from "./dto/send-message.input";
import { ReactToMessageInput } from "./dto/react-to-message.input";
import { ConversationMessagesInput } from "./dto/conversation-messages.input";
import { TypingInput } from "./dto/typing.input";
import { ToggleMessageSavedInput } from "./dto/toggle-message-saved.input";
import { EditMessageInput } from "./dto/edit-message.input";
import { DeleteMessageInput } from "./dto/delete-message.input";
import { ForwardMessageInput } from "./dto/forward-message.input";
import { SendCallSignalInput } from "./dto/send-call-signal.input";
import { MessageEventModel } from "./models/message-event.model";
import { CallSignalModel } from "./models/call-signal.model";
import { callPubSub, messagePubSub } from "./chat.events";

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
  @Mutation(() => MessageModel)
  toggleMessageSaved(
    @CurrentUser() user: UserModel,
    @Args("input") input: ToggleMessageSavedInput,
  ) {
    return this.messagesService.toggleMessageSaved(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageModel)
  editMessage(
    @CurrentUser() user: UserModel,
    @Args("input") input: EditMessageInput,
  ) {
    return this.messagesService.editMessage(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageModel)
  deleteMessage(
    @CurrentUser() user: UserModel,
    @Args("input") input: DeleteMessageInput,
  ) {
    return this.messagesService.deleteMessage(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => MessageModel)
  forwardMessage(
    @CurrentUser() user: UserModel,
    @Args("input") input: ForwardMessageInput,
  ) {
    return this.messagesService.forwardMessage(user.id, input);
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

  @UseGuards(GqlAuthGuard)
  @Mutation(() => CallSignalModel)
  sendCallSignal(
    @CurrentUser() user: UserModel,
    @Args("input") input: SendCallSignalInput,
  ) {
    return this.messagesService.sendCallSignal(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Subscription(() => MessageEventModel, {
    filter: (
      payload: { conversationId: string },
      variables: { conversationId: string },
    ) => payload.conversationId === variables.conversationId,
    resolve: (payload: { messageEvent: MessageEventModel }) => payload.messageEvent,
  })
  messageEvent(@Args("conversationId", { type: () => ID }) _conversationId: string) {
    return messagePubSub.asyncIterableIterator("message.event");
  }

  @UseGuards(GqlAuthGuard)
  @Subscription(() => CallSignalModel, {
    filter: (
      payload: { conversationId: string; targetUserId?: string | null; callSignal: { senderId: string } },
      variables: { conversationId: string },
      context: { req?: { user?: UserModel } },
    ) =>
      payload.conversationId === variables.conversationId &&
      payload.callSignal.senderId !== context.req?.user?.id &&
      (!payload.targetUserId || payload.targetUserId === context.req?.user?.id),
    resolve: (payload: { callSignal: CallSignalModel }) => payload.callSignal,
  })
  callSignal(@Args("conversationId", { type: () => ID }) _conversationId: string) {
    return callPubSub.asyncIterableIterator("call.signal");
  }
}
