import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from 'generated/prisma/client';

export class TaskProjectDto {
  @ApiProperty({ description: 'Project ID' })
  id: number;

  @ApiProperty({ description: 'Project name' })
  name: string;
}

export class TaskResponseDto {
  @ApiProperty({ description: 'Task ID' })
  id: number;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiProperty({ description: 'Task description', nullable: true })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, description: 'Task status' })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, description: 'Task priority' })
  priority: TaskPriority;

  @ApiProperty({ description: 'Due date', nullable: true })
  dueDate: Date | null;

  @ApiProperty({ description: 'Project ID' })
  projectId: number;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Related project' })
  project?: TaskProjectDto;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
