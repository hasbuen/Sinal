import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "../users/models/user.model";
import { CreateStatusUpdateInput } from "./dto/create-status-update.input";
import { StatusUpdateModel } from "./models/status-update.model";
import { StatusService } from "./status.service";

@Resolver(() => StatusUpdateModel)
export class StatusResolver {
  constructor(private readonly statusService: StatusService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [StatusUpdateModel])
  statusUpdates(@CurrentUser() user: UserModel) {
    return this.statusService.activeForUser(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => StatusUpdateModel)
  createStatusUpdate(
    @CurrentUser() user: UserModel,
    @Args("input") input: CreateStatusUpdateInput,
  ) {
    return this.statusService.create(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => StatusUpdateModel)
  markStatusViewed(
    @CurrentUser() user: UserModel,
    @Args("statusId", { type: () => ID }) statusId: string,
  ) {
    return this.statusService.markViewed(user.id, statusId);
  }
}
