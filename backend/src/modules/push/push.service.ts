import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterPushDeviceInput } from "./dto/register-push-device.input";

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  devicesForUser(userId: string) {
    return this.prisma.pushDevice.findMany({
      where: {
        userId,
        enabled: true,
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });
  }

  register(userId: string, input: RegisterPushDeviceInput) {
    return this.prisma.pushDevice.upsert({
      where: {
        token: input.token,
      },
      update: {
        userId,
        platform: input.platform,
        deviceName: input.deviceName?.trim() || null,
        appVersion: input.appVersion?.trim() || null,
        enabled: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        platform: input.platform,
        token: input.token,
        deviceName: input.deviceName?.trim() || null,
        appVersion: input.appVersion?.trim() || null,
      },
    });
  }

  async unregister(userId: string, token: string) {
    await this.prisma.pushDevice.updateMany({
      where: {
        userId,
        token,
      },
      data: {
        enabled: false,
        lastSeenAt: new Date(),
      },
    });

    return true;
  }
}
