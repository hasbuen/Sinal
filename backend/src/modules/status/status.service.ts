import { BadRequestException, Injectable } from "@nestjs/common";
import { StatusKind } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStatusUpdateInput } from "./dto/create-status-update.input";

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  private mapForUser<T extends { viewIds?: string[] | null }>(
    status: T,
    userId: string,
  ) {
    const viewIds = status.viewIds ?? [];
    return {
      ...status,
      viewIds,
      viewedByMe: viewIds.includes(userId),
    };
  }

  async activeForUser(userId: string) {
    const statuses = await this.prisma.statusUpdate.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        author: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return statuses.map((status) => this.mapForUser(status, userId));
  }

  async create(userId: string, input: CreateStatusUpdateInput) {
    if (input.kind === StatusKind.TEXT && !input.text?.trim()) {
      throw new BadRequestException("Status de texto precisa de uma mensagem.");
    }

    if (
      (input.kind === StatusKind.IMAGE || input.kind === StatusKind.VIDEO) &&
      !input.mediaUrl?.trim()
    ) {
      throw new BadRequestException("Status de midia precisa de um arquivo.");
    }

    const ttlSeconds = input.ttlSeconds ?? 24 * 60 * 60;
    const status = await this.prisma.statusUpdate.create({
      data: {
        authorId: userId,
        kind: input.kind,
        text: input.text?.trim() || null,
        mediaUrl: input.mediaUrl?.trim() || null,
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        background: input.background?.trim() || null,
        mimeType: input.mimeType?.trim() || null,
        sizeBytes: input.sizeBytes ?? null,
        durationMs: input.durationMs ?? null,
        viewIds: [],
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
      include: {
        author: true,
      },
    });

    return this.mapForUser(status, userId);
  }

  async markViewed(userId: string, statusId: string) {
    const status = await this.prisma.statusUpdate.findFirstOrThrow({
      where: {
        id: statusId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        author: true,
      },
    });

    if (status.viewIds.includes(userId)) {
      return this.mapForUser(status, userId);
    }

    const updated = await this.prisma.statusUpdate.update({
      where: {
        id: statusId,
      },
      data: {
        viewIds: {
          push: userId,
        },
      },
      include: {
        author: true,
      },
    });

    return this.mapForUser(updated, userId);
  }
}
