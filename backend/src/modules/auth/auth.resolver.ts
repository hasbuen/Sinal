import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthResponseModel } from "./dto/auth-response.model";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";
import { UserModel } from "../users/models/user.model";
import { CurrentUser } from "./current-user.decorator";
import { GqlAuthGuard } from "./gql-auth.guard";
import { UseGuards } from "@nestjs/common";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponseModel)
  register(@Args("input") input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthResponseModel)
  login(@Args("input") input: LoginInput) {
    return this.authService.login(input);
  }

  @Mutation(() => AuthResponseModel)
  appwriteExchangeToken(@Args("jwt") jwt: string) {
    return this.authService.exchangeAppwriteJwt(jwt);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => UserModel)
  me(@CurrentUser() user: UserModel) {
    return user;
  }
}
