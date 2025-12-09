import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from 'src/common/modules/auth/auth.service';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { mockPrismaService } from 'test/__mocks__/prisma.mock';
import { RegisterDto } from 'src/common/modules/auth/dto/requests/register.dto';
import { LoginDto } from 'src/common/modules/auth/dto/requests/login.dto';

jest.mock('bcrypt');
jest.mock('src/common/config/env.config', () => ({
  loadConfig: () => ({
    auth: {
      passwordSaltRounds: 10,
    },
    app: {
      frontendBaseUrl: 'http://localhost:3000',
    },
  }),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    phone: null,
    isVerified: true,
    isActive: true,
    verificationToken: null,
    verificationExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshToken = {
    id: 'token-1',
    userId: 'user-1',
    tokenHash: 'refresh-token-value',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer access-token',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService(),
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user with hashed password', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.register(mockRequest, registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe(mockRefreshToken.tokenHash);
    });

    it('should throw ConflictException when email already exists', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'test@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(mockRequest, registerDto)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        password_confirmation: 'differentPassword',
      };

      await expect(service.register(mockRequest, registerDto)).rejects.toThrow(
        new BadRequestException('Passwords do not match'),
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.login(mockRequest, loginDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw BadRequestException for non-existent email', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(mockRequest, loginDto)).rejects.toThrow(
        new BadRequestException('Invalid credentials'),
      );
    });

    it('should throw BadRequestException for incorrect password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(mockRequest, loginDto)).rejects.toThrow(
        new BadRequestException('Invalid credentials'),
      );
    });
  });

  describe('logout', () => {
    it('should create token blacklist entry and revoke oldest refresh token', async () => {
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (prisma.tokenBlacklist.create as jest.Mock).mockResolvedValue({
        id: 'blacklist-1',
      });
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });

      await service.logout('user-1', 'access-token');

      expect(jwtService.decode).toHaveBeenCalledWith('access-token');
      expect(prisma.tokenBlacklist.create).toHaveBeenCalled();
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const refreshTokenValue = 'valid-refresh-token';
      const tokenWithUser = {
        ...mockRefreshToken,
        user: mockUser,
        revokedAt: null,
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenWithUser,
      );
      jwtService.sign.mockReturnValue('new-access-token');
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({
        ...tokenWithUser,
        revokedAt: new Date(),
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );

      const result = await service.refreshAccessToken(
        mockRequest,
        refreshTokenValue,
      );

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: refreshTokenValue },
        include: { user: true },
      });
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for non-existent refresh token', async () => {
      const refreshTokenValue = 'invalid-token';

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshAccessToken(mockRequest, refreshTokenValue),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const refreshTokenValue = 'expired-token';
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        expiredToken,
      );

      await expect(
        service.refreshAccessToken(mockRequest, refreshTokenValue),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      const refreshTokenValue = 'revoked-token';
      const revokedToken = {
        ...mockRefreshToken,
        revokedAt: new Date(),
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        revokedToken,
      );

      await expect(
        service.refreshAccessToken(mockRequest, refreshTokenValue),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password with correct old password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare
        .mockResolvedValueOnce(true as never) // old password correct
        .mockResolvedValueOnce(false as never); // new password not same as old
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.changePassword('user-1', {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        password_confirmation: 'newPassword123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(2);
      expect(mockedBcrypt.hash).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent-user', {
          oldPassword: 'oldPassword123',
          newPassword: 'newPassword123',
          password_confirmation: 'newPassword123',
        }),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw BadRequestException for incorrect old password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword('user-1', {
          oldPassword: 'wrongPassword',
          newPassword: 'newPassword123',
          password_confirmation: 'newPassword123',
        }),
      ).rejects.toThrow(new BadRequestException('Old password is incorrect'));
    });

    it('should throw BadRequestException when new password is same as old', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare
        .mockResolvedValueOnce(true as never) // old password correct
        .mockResolvedValueOnce(true as never); // new password same as old

      await expect(
        service.changePassword('user-1', {
          oldPassword: 'password123',
          newPassword: 'password123',
          password_confirmation: 'password123',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'New password cannot be the same as old password',
        ),
      );
    });

    it('should revoke all refresh tokens after password change', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedBcrypt.compare
        .mockResolvedValueOnce(true as never) // old password correct
        .mockResolvedValueOnce(false as never); // new password not same as old
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      await service.changePassword('user-1', {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        password_confirmation: 'newPassword123',
      });

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user data by ID', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUserById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual(mockUser);
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserById('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      (prisma.tokenBlacklist.findUnique as jest.Mock).mockResolvedValue({
        id: 'blacklist-1',
        token: 'access-token',
      });

      const result = await service.isTokenBlacklisted('access-token');

      expect(result).toBe(true);
      expect(prisma.tokenBlacklist.findUnique).toHaveBeenCalledWith({
        where: { token: 'access-token' },
      });
    });

    it('should return false for non-blacklisted token', async () => {
      (prisma.tokenBlacklist.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('access-token');

      expect(result).toBe(false);
    });
  });
});
