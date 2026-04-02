import { Injectable } from "@nestjs/common";
import { extname } from "path";
import { randomUUID } from "crypto";
import { appConfig } from "../../config/app.config";
import { MediaKind } from "../conversations/models/chat.enums";

@Injectable()
export class UploadsService {
  buildUploadResponse(file: Express.Multer.File) {
    return {
      kind: this.inferKind(file.mimetype),
      url: `${appConfig.publicApiOrigin}/uploads/${file.filename}`,
      mimeType: file.mimetype,
      fileName: file.originalname,
      sizeBytes: file.size,
    };
  }

  createFilename(originalName: string) {
    return `${randomUUID()}${extname(originalName)}`;
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
