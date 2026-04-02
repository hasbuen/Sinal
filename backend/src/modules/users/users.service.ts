import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
