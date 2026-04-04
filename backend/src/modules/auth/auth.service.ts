import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { AppwriteService } from "../../appwrite/appwrite.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly appwriteService: AppwriteService,
  ) {}

  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      throw new BadRequestException("E-mail ou username ja cadastrado.");
    }

    const passwordHash = await hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        displayName: input.displayName.trim(),
        passwordHash,
      },
    });

    return this.buildAuthPayload(user.id);
  }

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    return this.buildAuthPayload(user.id);
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async exchangeAppwriteJwt(appwriteJwt: string) {
    const user = await this.appwriteService.exchangeUserJwt(appwriteJwt);
    return this.buildAuthPayload(user.id);
  }

  async verifyAccessToken(accessToken: string) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
      username: string;
    }>(accessToken);

    return this.validateUser(payload.sub);
  }

  private async buildAuthPayload(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      accessToken,
      user,
    };
  }
}
