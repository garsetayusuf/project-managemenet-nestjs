import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from 'src/common/modules/tasks/tasks.service';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { CreateTaskDto } from 'src/common/modules/tasks/dto/request/create-task.dto';
import { UpdateTaskDto } from 'src/common/modules/tasks/dto/request/update-task.dto';
import { FilterTasksDto } from 'src/common/modules/tasks/dto/request/filter-tasks.dto';
import { mockPrismaService } from 'test/__mocks__/prisma.mock';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: ReturnType<typeof mockPrismaService>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    userId: 'user-1',
  };

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'A test task',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: null,
    projectId: 1,
    userId: 'user-1',
    project: mockProject,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const prismaServiceMock = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = prismaServiceMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task in user owned project', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'A new task',
        projectId: 1,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await service.create('user-1', createDto);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.task.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'A new task',
        projectId: 999,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'A new task',
        projectId: 1,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        userId: 'different-user',
      });

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        new ForbiddenException('You do not have access to this project'),
      );
    });

    it('should set default status and priority', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'A new task',
        projectId: 1,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

      await service.create('user-1', createDto);

      const callArgs = (prisma.task.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.status).toBe('PENDING');
      expect(callArgs.data.priority).toBe('MEDIUM');
    });
  });

  describe('findAll', () => {
    it('should return all tasks for a user', async () => {
      const tasks = [mockTask, { ...mockTask, id: 2, title: 'Task 2' }];

      (prisma.task.findMany as jest.Mock).mockResolvedValue(tasks);

      const filters: FilterTasksDto = {};
      const result = await service.findAll('user-1', filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter tasks by projectId', async () => {
      const tasks = [mockTask];

      (prisma.task.findMany as jest.Mock).mockResolvedValue(tasks);

      const filters: FilterTasksDto = { projectId: 1 };
      await service.findAll('user-1', filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          projectId: 1,
        },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter tasks by status', async () => {
      const tasks = [mockTask];

      (prisma.task.findMany as jest.Mock).mockResolvedValue(tasks);

      const filters: FilterTasksDto = { status: 'PENDING' };
      await service.findAll('user-1', filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING',
        },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter tasks by priority', async () => {
      const tasks = [mockTask];

      (prisma.task.findMany as jest.Mock).mockResolvedValue(tasks);

      const filters: FilterTasksDto = { priority: 'HIGH' };
      await service.findAll('user-1', filters);

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          priority: 'HIGH',
        },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no tasks', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const filters: FilterTasksDto = {};
      const result = await service.findAll('user-no-tasks', filters);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const result = await service.findOne('user-1', 1);

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { project: true },
      });
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task');
    });

    it('should throw NotFoundException when task does not exist', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('user-1', 999)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the task', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      await expect(service.findOne('different-user', 1)).rejects.toThrow(
        new ForbiddenException('You do not have access to this task'),
      );
    });
  });

  describe('update', () => {
    it('should update task with provided fields', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
        status: 'DONE',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        ...updateDto,
      });

      const result = await service.update('user-1', 1, updateDto);

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.task.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('user-1', 999, updateDto)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the task', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      await expect(
        service.update('different-user', 1, updateDto),
      ).rejects.toThrow(
        new ForbiddenException('You do not have access to this task'),
      );
    });

    it('should handle partial updates', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Title',
      };

      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        title: 'Updated Title',
      });

      await service.update('user-1', 1, updateDto);

      const callArgs = (prisma.task.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      await service.remove('user-1', 1);

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('user-1', 999)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
    });

    it('should throw ForbiddenException when user does not own the task', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      await expect(service.remove('different-user', 1)).rejects.toThrow(
        new ForbiddenException('You do not have access to this task'),
      );
    });
  });
});
