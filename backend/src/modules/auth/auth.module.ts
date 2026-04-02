import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { SignOptions } from "jsonwebtoken";
import { appConfig } from "../../config/app.config";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: appConfig.jwtSecret,
      signOptions: {
        expiresIn: appConfig.jwtExpiresIn as SignOptions["expiresIn"],
      },
    }),
  ],
  providers: [AuthResolver, AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
