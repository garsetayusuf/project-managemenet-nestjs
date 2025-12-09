import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/request/create-project.dto';
import { UpdateProjectDto } from './dto/request/update-project.dto';
import { ProjectResponseDto } from './dto/response/project-response.dto';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { camelCaseToWords } from 'src/helpers/transform-camel-case';
import { IsPrivate } from 'src/common/decorators/private.decorator';
import { DynamicApiExceptions } from 'src/common/decorators/swagger-dynamic-response.decorator';
import { ApiResponseDto } from 'src/helpers/dto/base-response.dto';
import { EmptyResponseDto } from 'src/helpers/dto/empty-response-dto';

@ApiTags(camelCaseToWords(ProjectsController.name))
@Controller()
@IsPrivate()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @DynamicApiExceptions(ProjectsService.prototype.create)
  @ApiResponseDto(ProjectResponseDto, {
    responseMessage: 'Project created successfully',
    summary: 'Create a new project',
    statusCode: 201,
  })
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Get()
  @DynamicApiExceptions(ProjectsService.prototype.findAll)
  @ApiResponseDto([ProjectResponseDto], {
    responseMessage: 'Projects retrieved successfully',
    summary: 'Get all projects',
  })
  findAll(@Request() req: AuthenticatedRequest): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAll(req.user.id);
  }

  @Get(':id')
  @DynamicApiExceptions(ProjectsService.prototype.findOne)
  @ApiResponseDto(ProjectResponseDto, {
    responseMessage: 'Project retrieved successfully',
    summary: 'Get project by ID',
  })
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @DynamicApiExceptions(ProjectsService.prototype.update)
  @ApiResponseDto(ProjectResponseDto, {
    responseMessage: 'Project updated successfully',
    summary: 'Update project by ID',
  })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(req.user.id, id, updateProjectDto);
  }

  @Delete(':id')
  @DynamicApiExceptions(ProjectsService.prototype.remove)
  @ApiResponseDto(EmptyResponseDto, {
    responseMessage: 'Project deleted successfully',
    summary: 'Delete project by ID',
  })
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
  ): Promise<void> {
    return this.projectsService.remove(req.user.id, id);
  }
}
