import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/request/create-project.dto';
import { UpdateProjectDto } from './dto/request/update-project.dto';
import { ProjectResponseDto } from './dto/response/project-response.dto';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        userId,
      },
    });

    return this.mapToResponse(project);
  }

  async findAll(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      ...this.mapToResponse(p),
      taskCount: p._count.tasks,
    }));
  }

  async findOne(userId: string, id: number): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true } },
        tasks: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return {
      ...this.mapToResponse(project),
      taskCount: project._count.tasks,
    };
  }

  async update(
    userId: string,
    id: number,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return this.mapToResponse(updated);
  }

  async remove(userId: string, id: number): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    await this.prisma.project.delete({
      where: { id },
    });
  }

  private mapToResponse(project: ProjectResponseDto): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      userId: project.userId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
