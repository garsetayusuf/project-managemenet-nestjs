import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from 'src/common/modules/tasks/tasks.controller';
import { TasksService } from 'src/common/modules/tasks/tasks.service';
import { CreateTaskDto } from 'src/common/modules/tasks/dto/request/create-task.dto';
import { UpdateTaskDto } from 'src/common/modules/tasks/dto/request/update-task.dto';
import { FilterTasksDto } from 'src/common/modules/tasks/dto/request/filter-tasks.dto';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'A test task',
    status: 'PENDING' as any,
    priority: 'MEDIUM' as any,
    dueDate: null,
    projectId: 1,
    userId: 'user-1',
    project: { id: 1, name: 'Test Project' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTasksService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'A new task',
        projectId: 1,
      };

      tasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(
        { user: { id: 'user-1' } } as any,
        createDto,
      );

      expect(tasksService.create).toHaveBeenCalledWith('user-1', createDto);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    it('should return all tasks for authenticated user', async () => {
      const tasks = [mockTask, { ...mockTask, id: 2, title: 'Task 2' }];
      const filters: FilterTasksDto = {};

      tasksService.findAll.mockResolvedValue(tasks);

      const result = await controller.findAll(
        { user: { id: 'user-1' } } as any,
        filters,
      );

      expect(tasksService.findAll).toHaveBeenCalledWith('user-1', filters);
      expect(result).toHaveLength(2);
    });

    it('should pass filters to service', async () => {
      const tasks = [mockTask];
      const filters: FilterTasksDto = { projectId: 1, status: 'PENDING' };

      tasksService.findAll.mockResolvedValue(tasks);

      await controller.findAll({ user: { id: 'user-1' } } as any, filters);

      expect(tasksService.findAll).toHaveBeenCalledWith('user-1', filters);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      tasksService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne(
        { user: { id: 'user-1' } } as any,
        1,
      );

      expect(tasksService.findOne).toHaveBeenCalledWith('user-1', 1);
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateDto: UpdateTaskDto = {
        title: 'Updated Task',
        status: 'COMPLETED' as any,
      };

      const updatedTask = { ...mockTask, ...updateDto } as any;
      tasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.update(
        { user: { id: 'user-1' } } as any,
        1,
        updateDto,
      );

      expect(tasksService.update).toHaveBeenCalledWith('user-1', 1, updateDto);
      expect(result).toEqual(updatedTask);
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      tasksService.remove.mockResolvedValue(undefined);

      await controller.remove({ user: { id: 'user-1' } } as any, 1);

      expect(tasksService.remove).toHaveBeenCalledWith('user-1', 1);
    });
  });
});
