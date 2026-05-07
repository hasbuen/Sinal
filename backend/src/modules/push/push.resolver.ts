import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UserModel } from "../users/models/user.model";
import { RegisterPushDeviceInput } from "./dto/register-push-device.input";
import { PushDeviceModel } from "./models/push-device.model";
import { PushService } from "./push.service";

@Resolver(() => PushDeviceModel)
export class PushResolver {
  constructor(private readonly pushService: PushService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [PushDeviceModel])
  pushDevices(@CurrentUser() user: UserModel) {
    return this.pushService.devicesForUser(user.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => PushDeviceModel)
  registerPushDevice(
    @CurrentUser() user: UserModel,
    @Args("input") input: RegisterPushDeviceInput,
  ) {
    return this.pushService.register(user.id, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  unregisterPushDevice(
    @CurrentUser() user: UserModel,
    @Args("token") token: string,
  ) {
    return this.pushService.unregister(user.id, token);
  }
}
