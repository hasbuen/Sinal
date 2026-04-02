import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { appConfig } from "../../config/app.config";
import { UploadsService } from "./uploads.service";
import { AuthGuard } from "@nestjs/passport";

@Controller("api/uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: appConfig.uploadDir,
        filename: (_request, file, callback) => {
          callback(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
        },
      }),
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.buildUploadResponse(file);
  }
}
