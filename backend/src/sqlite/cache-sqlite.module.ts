import { Global, Module } from "@nestjs/common";
import { CacheSqliteService } from "./cache-sqlite.service";

@Global()
@Module({
  providers: [CacheSqliteService],
  exports: [CacheSqliteService],
})
export class CacheSqliteModule {}
