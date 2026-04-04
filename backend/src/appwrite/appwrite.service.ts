import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { hash } from "bcryptjs";
import {
  Account,
  AppwriteException,
  Client,
  Databases,
  ID,
  Models,
  Query,
  Teams,
  Users,
} from "node-appwrite";
import type { User as PrismaUser } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CacheSqliteService } from "../sqlite/cache-sqlite.service";
import { appConfig } from "../config/app.config";
import { CreateAppwriteGroupInput } from "./dto/create-appwrite-group.input";

type AppwriteAccountUser = Models.User<Models.Preferences>;
const defaultGroupRoles = ["owner", "admin", "member"];

@Injectable()
export class AppwriteService {
  private readonly logger = new Logger(AppwriteService.name);
  private readonly config = appConfig.appwrite;
  private readonly adminClient: Client | null;
  private readonly adminUsers: Users | null;
  private readonly adminTeams: Teams | null;
  private readonly adminDatabases: Databases | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly sqliteCache: CacheSqliteService,
  ) {
    if (
      this.config.endpoint &&
      this.config.projectId &&
      this.config.apiKey
    ) {
      this.adminClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setKey(this.config.apiKey);
      this.adminUsers = new Users(this.adminClient);
      this.adminTeams = new Teams(this.adminClient);
      this.adminDatabases = new Databases(this.adminClient);
    } else {
      this.adminClient = null;
      this.adminUsers = null;
      this.adminTeams = null;
      this.adminDatabases = null;
    }
  }

  isConfigured() {
    return Boolean(this.adminClient);
  }

  isAdminEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    if (appConfig.nodeEnv !== "production" && this.config.adminEmails.length === 0) {
      return true;
    }

    return this.config.adminEmails.some(
      (candidate) => candidate.toLowerCase() === normalized,
    );
  }

  assertAdminAccess(email: string) {
    if (!this.isConfigured()) {
      throw new BadRequestException("Appwrite nao configurado no backend.");
    }

    if (!this.isAdminEmail(email)) {
      throw new ForbiddenException("Usuario sem acesso ao painel Appwrite.");
    }
  }

  private getDocumentClient() {
    if (!this.adminDatabases || !this.config.databaseId) {
      return null;
    }

    return {
      databases: this.adminDatabases,
      databaseId: this.config.databaseId,
    };
  }

  private async upsertDocument(
    collectionId: string | undefined,
    documentId: string,
    data: Record<string, unknown>,
  ) {
    const documentClient = this.getDocumentClient();
    if (!documentClient || !collectionId) {
      return;
    }

    try {
      await documentClient.databases.updateDocument(
        documentClient.databaseId,
        collectionId,
        documentId,
        data,
      );
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        await documentClient.databases.createDocument(
          documentClient.databaseId,
          collectionId,
          documentId,
          data,
        );
        return;
      }

      throw error;
    }
  }

  private slugify(value: string) {
    const base = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24);

    return base || "sinal.user";
  }

  private async generateUniqueUsername(seed: string) {
    const base = this.slugify(seed);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}.${attempt}`;
      const existing = await this.prisma.user.findUnique({
        where: { username: candidate },
      });

      if (!existing) {
        return candidate;
      }
    }

    return `${base}.${Date.now().toString().slice(-5)}`;
  }

  async exchangeUserJwt(appwriteJwt: string) {
    if (!this.config.endpoint || !this.config.projectId) {
      throw new BadRequestException("Appwrite nao configurado no backend.");
    }

    const userClient = new Client()
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId)
      .setJWT(appwriteJwt);
    const account = new Account(userClient);
    const appwriteUser = await account.get();
    const email = (appwriteUser.email || "").trim().toLowerCase();

    if (!email) {
      throw new BadRequestException(
        "A conta Appwrite nao retornou um e-mail valido.",
      );
    }

    let localUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!localUser) {
      localUser = await this.prisma.user.create({
        data: {
          email,
          username: await this.generateUniqueUsername(
            appwriteUser.name || email.split("@")[0] || "sinal.user",
          ),
          displayName: appwriteUser.name?.trim() || email.split("@")[0] || "Usuario",
          passwordHash: await hash(randomUUID(), 10),
          avatarUrl:
            typeof appwriteUser.prefs?.avatarUrl === "string"
              ? appwriteUser.prefs.avatarUrl
              : undefined,
          bio:
            typeof appwriteUser.prefs?.bio === "string"
              ? appwriteUser.prefs.bio
              : undefined,
        },
      });
    } else {
      localUser = await this.prisma.user.update({
        where: { id: localUser.id },
        data: {
          displayName: appwriteUser.name?.trim() || localUser.displayName,
          avatarUrl:
            typeof appwriteUser.prefs?.avatarUrl === "string"
              ? appwriteUser.prefs.avatarUrl
              : localUser.avatarUrl,
          bio:
            typeof appwriteUser.prefs?.bio === "string"
              ? appwriteUser.prefs.bio
              : localUser.bio,
        },
      });
    }

    await this.syncUserMirror(localUser, appwriteUser);
    return localUser;
  }

  async syncUserMirror(localUser: PrismaUser, appwriteUser?: AppwriteAccountUser) {
    try {
      await this.upsertDocument(this.config.usersCollectionId, localUser.id, {
        localUserId: localUser.id,
        appwriteUserId: appwriteUser?.$id || null,
        email: localUser.email,
        username: localUser.username,
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl || null,
        bio: localUser.bio || null,
        status: appwriteUser?.status ?? true,
        emailVerification: appwriteUser?.emailVerification ?? false,
        labels: appwriteUser?.labels ?? [],
        createdAt: localUser.createdAt.toISOString(),
        updatedAt: localUser.updatedAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar user mirror no Appwrite: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      );
    }
  }

  async syncGroupMirror(group: {
    id: string;
    title?: string | null;
    description?: string | null;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{ userId: string }>;
  }) {
    try {
      await this.upsertDocument(this.config.groupsCollectionId, group.id, {
        localGroupId: group.id,
        title: group.title || "Grupo",
        description: group.description || null,
        avatarUrl: group.avatarUrl || null,
        memberUserIds: group.members?.map((member) => member.userId) || [],
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar group mirror no Appwrite: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      );
    }
  }

  async syncMessageMirror(message: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: string;
    text?: string | null;
    emoji?: string | null;
    linkUrl?: string | null;
    linkTitle?: string | null;
    linkDescription?: string | null;
    metadata?: unknown;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date | null;
    editedAt?: Date | null;
    deletedAt?: Date | null;
    attachments?: Array<{
      kind: string;
      url: string;
      mimeType: string;
      fileName: string;
      sizeBytes: number;
      thumbnailUrl?: string | null;
    }>;
  }) {
    try {
      await this.upsertDocument(this.config.messagesCollectionId, message.id, {
        localMessageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        kind: message.kind,
        text: message.text || null,
        emoji: message.emoji || null,
        linkUrl: message.linkUrl || null,
        linkTitle: message.linkTitle || null,
        linkDescription: message.linkDescription || null,
        metadata:
          message.metadata && typeof message.metadata === "object"
            ? JSON.stringify(message.metadata)
            : null,
        attachments:
          message.attachments && message.attachments.length > 0
            ? JSON.stringify(
                message.attachments.map((attachment) => ({
                  kind: attachment.kind,
                  url: attachment.url,
                  mimeType: attachment.mimeType,
                  fileName: attachment.fileName,
                  sizeBytes: attachment.sizeBytes,
                  thumbnailUrl: attachment.thumbnailUrl || null,
                })),
              )
            : null,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        expiresAt: message.expiresAt?.toISOString() || null,
        editedAt: message.editedAt?.toISOString() || null,
        deletedAt: message.deletedAt?.toISOString() || null,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar message mirror no Appwrite: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`,
      );
    }
  }

  async getDashboard() {
    if (!this.isConfigured() || !this.adminUsers || !this.adminTeams) {
      return {
        configured: false,
        appwriteUserCount: 0,
        appwriteGroupCount: 0,
        mongoEnabled: Boolean(appConfig.databaseUrl),
        redisEnabled: Boolean(appConfig.redisUrl),
        sqliteEnabled: Boolean(appConfig.sqlitePath),
        mirrorCollections: [],
      };
    }

    const [users, groups] = await Promise.all([
      this.adminUsers.list({ total: true }),
      this.adminTeams.list({ total: true }),
    ]);

    const mirrorCollections = [
      this.config.usersCollectionId ? "users" : null,
      this.config.messagesCollectionId ? "messages" : null,
      this.config.groupsCollectionId ? "groups" : null,
    ].filter((item): item is string => Boolean(item));

    this.sqliteCache.cacheConversation(
      "appwrite-dashboard",
      JSON.stringify({
        users: users.total,
        groups: groups.total,
        generatedAt: new Date().toISOString(),
      }),
    );
    await this.redisService.enqueue("appwrite-admin", {
      type: "dashboard:view",
      users: users.total,
      groups: groups.total,
    });

    return {
      configured: true,
      appwriteUserCount: users.total,
      appwriteGroupCount: groups.total,
      mongoEnabled: Boolean(appConfig.databaseUrl),
      redisEnabled: Boolean(appConfig.redisUrl),
      sqliteEnabled: Boolean(appConfig.sqlitePath),
      mirrorCollections,
    };
  }

  async listUsers(search?: string) {
    if (!this.adminUsers) {
      return [];
    }

    const result = await this.adminUsers.list({
      search: search?.trim() || undefined,
      total: false,
    });

    return result.users.map((user) => ({
      id: user.$id,
      name: user.name || user.email || "Usuario",
      email: user.email || null,
      status: user.status,
      emailVerification: user.emailVerification,
      labels: user.labels || [],
      lastSeenAt: user.accessedAt || null,
    }));
  }

  async listGroups(search?: string) {
    if (!this.adminTeams) {
      return [];
    }

    const result = await this.adminTeams.list({
      search: search?.trim() || undefined,
      total: false,
    });

    return result.teams.map((team) => ({
      id: team.$id,
      name: team.name,
      total: team.total,
      roles: defaultGroupRoles,
    }));
  }

  async createGroup(input: CreateAppwriteGroupInput) {
    if (!this.adminTeams) {
      throw new BadRequestException("Appwrite Teams nao configurado.");
    }

    const team = await this.adminTeams.create({
      teamId: ID.unique(),
      name: input.name.trim(),
      roles: defaultGroupRoles,
    });

    const memberIds = [...new Set(input.memberUserIds.map((item) => item.trim()).filter(Boolean))];
    await Promise.all(
      memberIds.map(async (userId) => {
        try {
          await this.adminTeams?.createMembership({
            teamId: team.$id,
            userId,
            roles: ["member"],
          });
        } catch (error) {
          this.logger.warn(
            `Falha ao adicionar ${userId} ao grupo Appwrite ${team.$id}: ${
              error instanceof Error ? error.message : "erro desconhecido"
            }`,
          );
        }
      }),
    );

      await this.upsertDocument(this.config.groupsCollectionId, team.$id, {
        appwriteTeamId: team.$id,
        title: team.name,
        memberUserIds: memberIds,
        roles: defaultGroupRoles,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    return {
      id: team.$id,
      name: team.name,
      total: memberIds.length,
      roles: defaultGroupRoles,
    };
  }
}
