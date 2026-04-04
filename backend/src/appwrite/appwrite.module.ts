import { Module } from "@nestjs/common";
import { AppwriteService } from "./appwrite.service";
import { AppwriteResolver } from "./appwrite.resolver";

@Module({
  providers: [AppwriteService, AppwriteResolver],
  exports: [AppwriteService],
})
export class AppwriteModule {}
