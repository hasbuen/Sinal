import { Injectable } from "@nestjs/common";
import { extname } from "path";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { put } from "@vercel/blob";
import { appConfig } from "../../config/app.config";
import { MediaKind } from "../conversations/models/chat.enums";

@Injectable()
export class UploadsService {
  async storeFile(file: Express.Multer.File) {
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

  createFilename(originalName: string) {
    return `${randomUUID()}${extname(originalName)}`;
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
