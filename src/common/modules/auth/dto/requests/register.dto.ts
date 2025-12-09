import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'User password confirmation',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  password_confirmation: string;
}
