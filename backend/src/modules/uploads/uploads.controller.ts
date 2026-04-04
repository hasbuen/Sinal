import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadsService } from "./uploads.service";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 32 * 1024 * 1024,
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.storeFile(file);
  }

  @Get("appwrite/:fileId/view")
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async viewAppwriteFile(
    @Param("fileId") fileId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const file = await this.uploadsService.getAppwriteFile(fileId);
      return this.replyWithRange(request, response, file.buffer, file.mimeType, file.name);
    } catch {
      response.status(204).end();
      return;
    }
  }

  @Get("appwrite/:fileId/preview")
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  async previewAppwriteFile(
    @Param("fileId") fileId: string,
    @Res() response: Response,
  ) {
    try {
      const preview = await this.uploadsService.getAppwritePreview(fileId);
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Content-Length", preview.length.toString());
      response.send(preview);
    } catch {
      response.status(204).end();
    }
  }

  private replyWithRange(
    request: Request,
    response: Response,
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ) {
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Content-Type", mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );

    const range = request.headers.range;
    if (!range) {
      response.setHeader("Content-Length", buffer.length.toString());
      response.send(buffer);
      return;
    }

    const [rawStart, rawEnd] = range.replace("bytes=", "").split("-");
    const start = Number.parseInt(rawStart, 10);
    const end = rawEnd ? Number.parseInt(rawEnd, 10) : buffer.length - 1;

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end >= buffer.length ||
      start > end
    ) {
      response.status(416).end();
      return;
    }

    const chunk = buffer.subarray(start, end + 1);
    response.status(206);
    response.setHeader("Content-Length", chunk.length.toString());
    response.setHeader("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
    response.send(chunk);
  }
}
