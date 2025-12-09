import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsEnum, IsNumber } from 'class-validator';
import { TaskStatus, TaskPriority } from 'generated/prisma/client';

export class FilterTasksDto {
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @ApiProperty({ description: 'Project ID', format: 'number', required: false })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiProperty({
    enum: TaskStatus,
    description: 'Task status',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    description: 'Task priority',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
