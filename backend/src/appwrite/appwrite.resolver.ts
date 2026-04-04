import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../modules/auth/gql-auth.guard";
import { CurrentUser } from "../modules/auth/current-user.decorator";
import { UserModel } from "../modules/users/models/user.model";
import { AppwriteService } from "./appwrite.service";
import { AppwriteDashboardModel } from "./models/appwrite-dashboard.model";
import { AppwriteUserModel } from "./models/appwrite-user.model";
import { AppwriteGroupModel } from "./models/appwrite-group.model";
import { CreateAppwriteGroupInput } from "./dto/create-appwrite-group.input";

@Resolver()
export class AppwriteResolver {
  constructor(private readonly appwriteService: AppwriteService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => AppwriteDashboardModel)
  async appwriteDashboard(@CurrentUser() user: UserModel) {
    this.appwriteService.assertAdminAccess(user.email);
    return this.appwriteService.getDashboard();
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [AppwriteUserModel])
  async appwriteUsers(
    @CurrentUser() user: UserModel,
    @Args("search", { nullable: true }) search?: string,
  ) {
    this.appwriteService.assertAdminAccess(user.email);
    return this.appwriteService.listUsers(search);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [AppwriteGroupModel])
  async appwriteGroups(
    @CurrentUser() user: UserModel,
    @Args("search", { nullable: true }) search?: string,
  ) {
    this.appwriteService.assertAdminAccess(user.email);
    return this.appwriteService.listGroups(search);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => AppwriteGroupModel)
  async appwriteCreateGroup(
    @CurrentUser() user: UserModel,
    @Args("input") input: CreateAppwriteGroupInput,
  ) {
    this.appwriteService.assertAdminAccess(user.email);
    return this.appwriteService.createGroup(input);
  }
}
