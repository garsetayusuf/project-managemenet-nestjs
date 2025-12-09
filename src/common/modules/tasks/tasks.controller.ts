import type { FastifyRequest } from 'fastify';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/request/create-task.dto';
import { UpdateTaskDto } from './dto/request/update-task.dto';
import { FilterTasksDto } from './dto/request/filter-tasks.dto';
import { TaskResponseDto } from './dto/response/task-response.dto';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { camelCaseToWords } from 'src/helpers/transform-camel-case';
import { IsPrivate } from 'src/common/decorators/private.decorator';
import { DynamicApiExceptions } from 'src/common/decorators/swagger-dynamic-response.decorator';
import { ApiResponseDto } from 'src/helpers/dto/base-response.dto';
import { EmptyResponseDto } from 'src/helpers/dto/empty-response-dto';

@ApiTags(camelCaseToWords(TasksController.name))
@Controller()
@IsPrivate()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @DynamicApiExceptions(TasksService.prototype.create)
  @ApiResponseDto(TaskResponseDto, {
    responseMessage: 'Task created successfully',
    summary: 'Create a new task',
    statusCode: 201,
  })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(req.user.id, createTaskDto);
  }

  @Get()
  @DynamicApiExceptions(TasksService.prototype.findAll)
  @ApiResponseDto([TaskResponseDto], {
    responseMessage: 'Tasks retrieved successfully',
    summary: 'Get all tasks',
  })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() filters: FilterTasksDto,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.findAll(req.user.id, filters);
  }

  @Get(':id')
  @DynamicApiExceptions(TasksService.prototype.findOne)
  @ApiResponseDto(TaskResponseDto, {
    responseMessage: 'Task retrieved successfully',
    summary: 'Get task by ID',
  })
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @DynamicApiExceptions(TasksService.prototype.update)
  @ApiResponseDto(TaskResponseDto, {
    responseMessage: 'Task updated successfully',
    summary: 'Update task by ID',
  })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(req.user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @DynamicApiExceptions(TasksService.prototype.remove)
  @ApiResponseDto(EmptyResponseDto, {
    responseMessage: 'Task deleted successfully',
    summary: 'Delete task by ID',
  })
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ): Promise<void> {
    return this.tasksService.remove(req.user.id, id);
  }
}
