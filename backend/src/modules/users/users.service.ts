import { Injectable } from "@nestjs/common";
import { AppwriteService } from "../../appwrite/appwrite.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { UpdateUserSettingsInput } from "./dto/update-user-settings.input";
import { mergeUserSettings, normalizeUserSettings } from "./user-settings";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appwriteService: AppwriteService,
  ) {}

  async search(currentUserId: string, term?: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: term
          ? [
              { displayName: { contains: term, mode: "insensitive" } },
              { username: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { displayName: "asc" },
      take: 30,
    });
  }

  async updateProfile(currentUserId: string, input: UpdateProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: currentUserId },
      data: {
        displayName: input.displayName?.trim() || undefined,
        bio: input.bio?.trim() || undefined,
        avatarUrl: input.avatarUrl?.trim() || undefined,
      },
    });

    await this.appwriteService.syncUserMirror(user);
    return user;
  }

  getUserSettings(user: { userSettings?: unknown; settings?: unknown }) {
    return normalizeUserSettings(user.settings ?? user.userSettings);
  }

  async updateUserSettings(currentUserId: string, input: UpdateUserSettingsInput) {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUserId },
      select: { id: true, userSettings: true },
    });
    const nextSettings = mergeUserSettings(current.userSettings, input);

    const user = await this.prisma.user.update({
      where: { id: currentUserId },
      data: {
        userSettings: nextSettings,
      },
    });

    await this.appwriteService.syncUserMirror(user);
    return nextSettings;
  }
}
