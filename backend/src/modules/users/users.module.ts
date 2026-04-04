import { Module } from "@nestjs/common";
import { AppwriteModule } from "../../appwrite/appwrite.module";
import { UsersService } from "./users.service";
import { UsersResolver } from "./users.resolver";

@Module({
  imports: [AppwriteModule],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
