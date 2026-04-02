import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterInput } from "./dto/register.input";
import { LoginInput } from "./dto/login.input";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existing) {
      throw new BadRequestException("E-mail ou username ja cadastrado.");
    }

    const passwordHash = await hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      },
    });

    return this.buildAuthPayload(user.id);
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
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
