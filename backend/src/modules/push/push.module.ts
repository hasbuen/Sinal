import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PushResolver } from "./push.resolver";
import { PushService } from "./push.service";

@Module({
  imports: [PrismaModule],
  providers: [PushResolver, PushService],
})
export class PushModule {}
