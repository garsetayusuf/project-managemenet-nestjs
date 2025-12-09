import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from 'src/common/modules/projects/projects.controller';
import { ProjectsService } from 'src/common/modules/projects/projects.service';
import { CreateProjectDto } from 'src/common/modules/projects/dto/request/create-project.dto';
import { UpdateProjectDto } from 'src/common/modules/projects/dto/request/update-project.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: jest.Mocked<ProjectsService>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    taskCount: 3,
  };

  beforeEach(async () => {
    const mockProjectsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get(ProjectsService);
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

      projectsService.create.mockResolvedValue(mockProject);

      const result = await controller.create(
        { user: { id: 'user-1' } } as any,
        createDto,
      );

      expect(projectsService.create).toHaveBeenCalledWith('user-1', createDto);
      expect(result).toEqual(mockProject);
    });
  });

  describe('findAll', () => {
    it('should return all projects for authenticated user', async () => {
      const projects = [mockProject, { ...mockProject, id: 2 }];

      projectsService.findAll.mockResolvedValue(projects);

      const result = await controller.findAll({
        user: { id: 'user-1' },
      } as any);

      expect(projectsService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a single project', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);

      const result = await controller.findOne(
        { user: { id: 'user-1' } } as any,
        1,
      );

      expect(projectsService.findOne).toHaveBeenCalledWith('user-1', 1);
      expect(result).toEqual(mockProject);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const updatedProject = { ...mockProject, ...updateDto };
      projectsService.update.mockResolvedValue(updatedProject);

      const result = await controller.update(
        { user: { id: 'user-1' } } as any,
        1,
        updateDto,
      );

      expect(projectsService.update).toHaveBeenCalledWith(
        'user-1',
        1,
        updateDto,
      );
      expect(result).toEqual(updatedProject);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      projectsService.remove.mockResolvedValue(undefined);

      await controller.remove({ user: { id: 'user-1' } } as any, 1);

      expect(projectsService.remove).toHaveBeenCalledWith('user-1', 1);
    });
  });
});
