import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/common/modules/auth/auth.controller';
import { AuthService } from 'src/common/modules/auth/auth.service';
import { RegisterDto } from 'src/common/modules/auth/dto/requests/register.dto';
import { LoginDto } from 'src/common/modules/auth/dto/requests/login.dto';
import { ChangePasswordDto } from 'src/common/modules/auth/dto/requests/changePassword.dto';
import { RefreshTokenDto } from 'src/common/modules/auth/dto/requests/refreshToken.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokenResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockUserResponse = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
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
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshAccessToken: jest.fn(),
      changePassword: jest.fn(),
      getUserById: jest.fn(),
      isTokenBlacklisted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register and return token response', async () => {
      const registerDto: RegisterDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      };

      (authService.register as jest.Mock).mockResolvedValue(mockTokenResponse);

      const result = await controller.register(mockRequest, registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        mockRequest,
        registerDto,
      );
      expect(result).toEqual(mockTokenResponse);
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('login', () => {
    it('should call authService.login and return token response', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockTokenResponse);

      const result = await controller.login(mockRequest, loginDto);

      expect(authService.login).toHaveBeenCalledWith(mockRequest, loginDto);
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('refreshAccessToken', () => {
    it('should call authService.refreshAccessToken and return token response', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(
        mockTokenResponse,
      );

      const result = await controller.refreshAccessToken(
        mockRequest,
        refreshTokenDto,
      );

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        mockRequest,
        refreshTokenDto.refreshToken,
      );
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user ID and token', async () => {
      const mockRequest = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
        headers: {
          authorization: 'Bearer access-token',
        },
      } as any;

      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(authService.logout).toHaveBeenCalledWith('user-1', 'access-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getProfile', () => {
    it('should call authService.getUserById and return user profile', async () => {
      const mockRequest = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as any;

      (authService.getUserById as jest.Mock).mockResolvedValue(
        mockUserResponse,
      );

      const result = await controller.getProfile(mockRequest);

      expect(authService.getUserById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUserResponse);
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword and return empty response', async () => {
      const mockRequest = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      } as any;

      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'password123',
        newPassword: 'newPassword123',
        password_confirmation: 'newPassword123',
      };

      (authService.changePassword as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.changePassword(mockRequest, {
        oldPassword: changePasswordDto.oldPassword,
        newPassword: changePasswordDto.newPassword,
        password_confirmation: changePasswordDto.password_confirmation,
      });

      expect(authService.changePassword).toHaveBeenCalledWith('user-1', {
        oldPassword: changePasswordDto.oldPassword,
        newPassword: changePasswordDto.newPassword,
        password_confirmation: changePasswordDto.password_confirmation,
      });
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});
