import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token (15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token (30 days)',
    example: 'refresh_token_string',
  })
  refreshToken: string;

  @ApiProperty({ description: 'Authenticated user information' })
  user: UserResponseDto;
}
