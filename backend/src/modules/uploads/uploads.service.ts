import { Injectable, NotFoundException } from "@nestjs/common";
import { extname } from "path";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { put } from "@vercel/blob";
import {
  AppwriteException,
  Client,
  ID,
  Storage,
} from "node-appwrite";
import { appConfig } from "../../config/app.config";
import { MediaKind } from "../conversations/models/chat.enums";

const { InputFile } = require("node-appwrite/file") as {
  InputFile: {
    fromBuffer(parts: Buffer, name: string): any;
  };
};

type StoredAttachment = {
  id?: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  thumbnailUrl?: string;
};

type AppwriteStoredFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

@Injectable()
export class UploadsService {
  private readonly appwriteBucketId = appConfig.appwrite.mediaBucketId;
  private readonly appwriteEndpoint = appConfig.appwrite.endpoint;
  private readonly appwriteProjectId = appConfig.appwrite.projectId;
  private readonly appwriteStorage: Storage | null;
  private bucketEnsured = false;

  constructor() {
    if (
      this.appwriteBucketId &&
      this.appwriteEndpoint &&
      this.appwriteProjectId &&
      appConfig.appwrite.apiKey
    ) {
      const client = new Client()
        .setEndpoint(this.appwriteEndpoint)
        .setProject(this.appwriteProjectId)
        .setKey(appConfig.appwrite.apiKey);
      this.appwriteStorage = new Storage(client);
    } else {
      this.appwriteStorage = null;
    }
  }

  async storeFile(file: Express.Multer.File): Promise<StoredAttachment> {
    if (this.appwriteStorage && this.appwriteBucketId) {
      await this.ensureAppwriteBucket();

      const stored = await this.appwriteStorage.createFile(
        this.appwriteBucketId,
        ID.unique(),
        InputFile.fromBuffer(file.buffer, file.originalname),
      );

      return {
        id: stored.$id,
        kind: this.inferKind(file.mimetype),
        url: this.createAppwriteProxyUrl(stored.$id, "view"),
        mimeType: stored.mimeType || file.mimetype,
        fileName: stored.name || file.originalname,
        sizeBytes: stored.sizeOriginal || file.size,
        thumbnailUrl:
          this.inferKind(file.mimetype) === MediaKind.IMAGE
            ? this.createAppwriteProxyUrl(stored.$id, "preview")
            : undefined,
      };
    }

    if (appConfig.blobReadWriteToken) {
      const extension = extname(file.originalname) || this.extensionFromMime(file.mimetype);
      const pathname = `uploads/${Date.now()}-${randomUUID()}${extension}`;
      const blob = await put(pathname, file.buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.mimetype,
        token: appConfig.blobReadWriteToken,
      });

      return {
        kind: this.inferKind(file.mimetype),
        url: blob.url,
        mimeType: file.mimetype,
        fileName: file.originalname,
        sizeBytes: file.size,
      };
    }

    await mkdir(appConfig.uploadDir, { recursive: true });
    const filename = `${Date.now()}-${this.createFilename(file.originalname)}`;
    await writeFile(`${appConfig.uploadDir}/${filename}`, file.buffer);

    return {
      kind: this.inferKind(file.mimetype),
      url: `${appConfig.publicApiOrigin}/uploads/${filename}`,
      mimeType: file.mimetype,
      fileName: file.originalname,
      sizeBytes: file.size,
    };
  }

  async getAppwriteFile(fileId: string): Promise<AppwriteStoredFile> {
    if (!this.appwriteStorage || !this.appwriteBucketId) {
      throw new NotFoundException("Appwrite Storage nao configurado.");
    }

    try {
      const [metadata, content] = await Promise.all([
        this.appwriteStorage.getFile(this.appwriteBucketId, fileId),
        this.appwriteStorage.getFileView(this.appwriteBucketId, fileId),
      ]);

      return {
        id: metadata.$id,
        name: metadata.name,
        mimeType: metadata.mimeType || "application/octet-stream",
        sizeBytes: metadata.sizeOriginal,
        buffer: Buffer.from(content),
      };
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        throw new NotFoundException("Arquivo nao encontrado no Appwrite.");
      }

      throw error;
    }
  }

  async getAppwritePreview(fileId: string) {
    if (!this.appwriteStorage || !this.appwriteBucketId) {
      throw new NotFoundException("Appwrite Storage nao configurado.");
    }

    try {
      const preview = await this.appwriteStorage.getFilePreview({
        bucketId: this.appwriteBucketId,
        fileId,
        width: 1200,
        height: 1200,
      });

      return Buffer.from(preview);
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        throw new NotFoundException("Preview nao encontrado no Appwrite.");
      }

      throw error;
    }
  }

  createFilename(originalName: string) {
    return `${randomUUID()}${extname(originalName)}`;
  }

  private createAppwriteProxyUrl(fileId: string, variant: "view" | "preview") {
    return `${appConfig.publicApiOrigin}/api/uploads/appwrite/${fileId}/${variant}`;
  }

  private async ensureAppwriteBucket() {
    if (!this.appwriteStorage || !this.appwriteBucketId || this.bucketEnsured) {
      return;
    }

    try {
      await this.appwriteStorage.getBucket(this.appwriteBucketId);
      this.bucketEnsured = true;
      return;
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) {
        throw error;
      }
    }

    await this.appwriteStorage.createBucket({
      bucketId: this.appwriteBucketId,
      name: "Sinal Media",
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 50 * 1024 * 1024,
      allowedFileExtensions: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "mp4",
        "webm",
        "mov",
        "mp3",
        "m4a",
        "ogg",
        "wav",
        "pdf",
      ],
      encryption: true,
      antivirus: true,
      transformations: true,
    });

    this.bucketEnsured = true;
  }

  private extensionFromMime(mimeType: string) {
    if (mimeType.startsWith("image/")) return ".png";
    if (mimeType.startsWith("audio/")) return ".webm";
    if (mimeType.startsWith("video/")) return ".mp4";
    return "";
  }

  private inferKind(mimeType: string) {
    if (mimeType.startsWith("image/")) {
      return MediaKind.IMAGE;
    }

    if (mimeType.startsWith("audio/")) {
      return MediaKind.AUDIO;
    }

    if (mimeType.startsWith("video/")) {
      return MediaKind.VIDEO;
    }

    return MediaKind.FILE;
  }
}
