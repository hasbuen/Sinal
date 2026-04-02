import { Args, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "./models/user.model";
import { UserSearchInput } from "./dto/user-search.input";
import { UsersService } from "./users.service";

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
}
