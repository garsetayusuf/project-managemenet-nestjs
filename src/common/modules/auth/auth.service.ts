import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma/client';
import { loadConfig } from 'src/common/config/env.config';
import { LoginDto } from './dto/requests/login.dto';
import { RegisterDto } from './dto/requests/register.dto';
import { TokenResponseDto } from './dto/response/token-response.dto';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { generateRandomString } from 'src/helpers/generate-random-string';
import { ChangePasswordDto } from './dto/requests/changePassword.dto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(
    req: AuthenticatedRequest,
    registerDto: RegisterDto,
  ): Promise<TokenResponseDto> {
    if (registerDto.password !== registerDto.password_confirmation) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      loadConfig().auth.passwordSaltRounds,
    );

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
      },
    });

    return this.generateTokens(req, user);
  }

  async login(
    req: AuthenticatedRequest,
    loginDto: LoginDto,
  ): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.generateTokens(req, user);
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    const tokenPayload = this.jwtService.decode(accessToken) as any;

    await this.prisma.tokenBlacklist.create({
      data: {
        token: accessToken,
        userId,
        expiresAt: tokenPayload?.exp
          ? new Date(tokenPayload.exp * 1000)
          : new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.revokeCurrentRefreshToken(userId);
  }

  async logoutAll(userId: string, accessToken: string): Promise<void> {
    const tokenPayload = this.jwtService.decode(accessToken) as any;

    await this.prisma.tokenBlacklist.create({
      data: {
        token: accessToken,
        userId,
        expiresAt: tokenPayload?.exp
          ? new Date(tokenPayload.exp * 1000)
          : new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async refreshAccessToken(
    req: AuthenticatedRequest,
    refreshToken: string,
  ): Promise<TokenResponseDto> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: refreshToken },
      include: { user: true },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = token.user;

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });

    return this.generateTokens(req, user);
  }

  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    if (data.newPassword !== data.password_confirmation) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!passwordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    const newPasswordSameAsOld = await bcrypt.compare(
      data.newPassword,
      user.password,
    );
    if (newPasswordSameAsOld) {
      throw new BadRequestException(
        'New password cannot be the same as old password',
      );
    }

    const hashedPassword = await bcrypt.hash(
      data.newPassword,
      loadConfig().auth.passwordSaltRounds,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.prisma.tokenBlacklist.findUnique({
      where: { token },
    });
    return !!blacklistedToken;
  }

  private async generateTokens(
    req: AuthenticatedRequest,
    user: User,
  ): Promise<TokenResponseDto> {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '15m',
    });

    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

    const randomToken = generateRandomString(36);
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        tokenHash: randomToken,
        userId: user.id,
        deviceName: req.headers['user-agent'],
        ipAddress: req.socket.remoteAddress,
        expiresAt: refreshTokenExpiry,
      },
    });

    return {
      accessToken,
      refreshToken: refreshToken.tokenHash,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private async revokeCurrentRefreshToken(userId: string): Promise<void> {
    const oldestToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestToken) {
      await this.prisma.refreshToken.update({
        where: { id: oldestToken.id },
        data: { revokedAt: new Date() },
      });
    }
  }
}
