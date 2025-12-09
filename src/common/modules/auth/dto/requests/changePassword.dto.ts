import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'Old password',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'New password',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'User password confirmation',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  password_confirmation: string;
}
