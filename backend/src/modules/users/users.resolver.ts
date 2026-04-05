import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "./models/user.model";
import { UserSearchInput } from "./dto/user-search.input";
import { UsersService } from "./users.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { UpdateUserSettingsInput } from "./dto/update-user-settings.input";
import { UserSettingsModel } from "./models/user-settings.model";

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [UserModel])
  users(
    @CurrentUser() user: UserModel,
    @Args("input", { nullable: true }) input?: UserSearchInput,
  ) {
    return this.usersService.search(user.id, input?.term);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserModel)
  updateProfile(
    @CurrentUser() user: UserModel,
    @Args("input") input: UpdateProfileInput,
  ) {
    return this.usersService.updateProfile(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserSettingsModel)
  updateUserSettings(
    @CurrentUser() user: UserModel,
    @Args("input") input: UpdateUserSettingsInput,
  ) {
    return this.usersService.updateUserSettings(user.id, input);
  }

  @ResolveField(() => UserSettingsModel)
  settings(@Parent() user: UserModel & { userSettings?: unknown; settings?: unknown }) {
    return this.usersService.getUserSettings(user);
  }
}
