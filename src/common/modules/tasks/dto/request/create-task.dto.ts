import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { TaskStatus, TaskPriority } from 'generated/prisma/client';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Complete project' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project ID', format: 'number' })
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @ApiProperty({
    enum: TaskStatus,
    description: 'Task status',
    default: 'PENDING',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    description: 'Task priority',
    default: 'MEDIUM',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Due date',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
