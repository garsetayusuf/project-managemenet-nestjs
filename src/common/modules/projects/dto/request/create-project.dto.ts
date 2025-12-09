import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'My Project' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project description', example: 'Project description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
