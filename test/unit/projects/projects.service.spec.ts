import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsService } from 'src/common/modules/projects/projects.service';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { CreateProjectDto } from 'src/common/modules/projects/dto/request/create-project.dto';
import { UpdateProjectDto } from 'src/common/modules/projects/dto/request/update-project.dto';
import { mockPrismaService } from 'test/__mocks__/prisma.mock';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tasks: 3 },
  };

  const mockProjectWithTasks = {
    ...mockProject,
    tasks: [
      { id: 1, title: 'Task 1', projectId: 1 },
      { id: 2, title: 'Task 2', projectId: 1 },
      { id: 3, title: 'Task 3', projectId: 1 },
    ],
  };

  beforeEach(async () => {
    const prismaServiceMock = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = prismaServiceMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'A new project',
      };

      (prisma.project.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.create('user-1', createDto);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          userId: 'user-1',
        },
      });
      expect(result.name).toBe('Test Project');
      expect(result.userId).toBe('user-1');
    });

    it('should handle create errors gracefully', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'A new project',
      };

      (prisma.project.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create('user-1', createDto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      const projects = [mockProject, { ...mockProject, id: 2, name: 'Project 2' }];

      (prisma.project.findMany as jest.Mock).mockResolvedValue(projects);

      const result = await service.findAll('user-1');

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].taskCount).toBe(3);
    });

    it('should return empty array when user has no projects', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll('user-no-projects');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single project with full details', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(
        mockProjectWithTasks,
      );

      const result = await service.findOne('user-1', 1);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          _count: { select: { tasks: true } },
          tasks: true,
        },
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Project');
      expect(result.taskCount).toBe(3);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('user-1', 999)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(service.findOne('different-user', 1)).rejects.toThrow(
        new ForbiddenException('You do not have access to this project'),
      );
    });
  });

  describe('update', () => {
    it('should update project with provided fields', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        ...updateDto,
      });

      const result = await service.update('user-1', 1, updateDto);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Project',
          description: 'Updated description',
        },
      });
      expect(result.name).toBe('Updated Project');
    });

    it('should update only provided fields', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        name: 'Updated Project',
      });

      await service.update('user-1', 1, updateDto);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Project',
        },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('user-1', 999, updateDto)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(
        service.update('different-user', 1, updateDto),
      ).rejects.toThrow(
        new ForbiddenException('You do not have access to this project'),
      );
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      await service.remove('user-1', 1);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('user-1', 999)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(service.remove('different-user', 1)).rejects.toThrow(
        new ForbiddenException('You do not have access to this project'),
      );
    });
  });
});
