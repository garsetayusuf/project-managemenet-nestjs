import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/requests/register.dto';
import { LoginDto } from './dto/requests/login.dto';
import { IsPublic } from 'src/common/decorators/public.decorator';
import {
  TokenResponseDto,
  UserResponseDto,
} from './dto/response/token-response.dto';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { camelCaseToWords } from 'src/helpers/transform-camel-case';
import { DynamicApiExceptions } from 'src/common/decorators/swagger-dynamic-response.decorator';
import { ApiResponseDto } from 'src/helpers/dto/base-response.dto';
import { EmptyResponseDto } from 'src/helpers/dto/empty-response-dto';
import { IsPrivate } from 'src/common/decorators/private.decorator';
import { RefreshTokenDto } from './dto/requests/refreshToken.dto';
import { ChangePasswordDto } from './dto/requests/changePassword.dto';

@ApiTags(camelCaseToWords(AuthController.name))
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @IsPublic()
  @DynamicApiExceptions(AuthService.prototype.register)
  @ApiResponseDto(TokenResponseDto, {
    responseMessage: 'User registered successfully',
    summary: 'Registration User',
    statusCode: 201,
  })
  async register(
    @Request() req: AuthenticatedRequest,
    @Body() registerDto: RegisterDto,
  ): Promise<TokenResponseDto> {
    return this.authService.register(req, registerDto);
  }

  @Post('login')
  @IsPublic()
  @DynamicApiExceptions(AuthService.prototype.login)
  @ApiResponseDto(TokenResponseDto, {
    responseMessage: 'User logged in successfully',
    summary: 'Login User',
  })
  async login(
    @Request() req: AuthenticatedRequest,
    @Body() loginDto: LoginDto,
  ): Promise<TokenResponseDto> {
    return this.authService.login(req, loginDto);
  }

  @Post('refresh')
  @IsPublic()
  @DynamicApiExceptions(AuthService.prototype.refreshAccessToken)
  @ApiResponseDto(TokenResponseDto, {
    responseMessage: 'Access token refreshed successfully',
    summary: 'Refresh access token using refresh token',
  })
  async refreshAccessToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshAccessToken(req, body.refreshToken);
  }

  @Get('logout')
  @IsPrivate()
  @DynamicApiExceptions(AuthService.prototype.logout)
  @ApiResponseDto(EmptyResponseDto, {
    responseMessage: 'Logged out successfully',
    summary: 'Logout user and revoke refresh tokens',
  })
  async logout(
    @Request() req: AuthenticatedRequest,
  ): Promise<EmptyResponseDto> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Authorization token is required');
    }
    await this.authService.logout(req.user.id, token);
    return { message: 'Logged out successfully' };
  }

  @Get('logout-all')
  @IsPrivate()
  @DynamicApiExceptions(AuthService.prototype.logoutAll)
  @ApiResponseDto(EmptyResponseDto, {
    responseMessage: 'Logged out from all devices successfully',
    summary: 'Logout user from all devices and revoke all refresh tokens',
  })
  async logoutAll(
    @Request() req: AuthenticatedRequest,
  ): Promise<EmptyResponseDto> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Authorization token is required');
    }
    await this.authService.logoutAll(req.user.id, token);
    return { message: 'Logged out from all devices successfully' };
  }

  @Get('profile')
  @IsPrivate()
  @DynamicApiExceptions(AuthService.prototype.getUserById)
  @ApiResponseDto(UserResponseDto, {
    responseMessage: 'Profile retrieved successfully',
    summary: 'Get user profile',
  })
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    const user = await this.authService.getUserById(req.user.id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  @Patch('change-password')
  @IsPrivate()
  @DynamicApiExceptions(AuthService.prototype.changePassword)
  @ApiResponseDto(EmptyResponseDto, {
    responseMessage: 'Password changed successfully',
    summary: 'Change user password',
  })
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ): Promise<EmptyResponseDto> {
    await this.authService.changePassword(req.user.id, body);
    return { message: 'Password changed successfully' };
  }
}
