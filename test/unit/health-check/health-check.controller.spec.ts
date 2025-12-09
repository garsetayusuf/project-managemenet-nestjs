import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckController } from 'src/common/modules/health-check/health-check.controller';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { mockPrismaService } from 'test/__mocks__/prisma.mock';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let httpHealthIndicator: jest.Mocked<HttpHealthIndicator>;
  let prismaHealthIndicator: jest.Mocked<PrismaHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockHttpHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const mockPrismaHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService(),
        },
      ],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
    healthCheckService = module.get(HealthCheckService);
    httpHealthIndicator = module.get(HttpHealthIndicator);
    prismaHealthIndicator = module.get(PrismaHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealthCheck', () => {
    it('should return health check status', async () => {
      const expectedResult = {
        status: 'ok',
        info: {
          google: {
            status: 'up',
            message: 'Google is up',
          },
        },
        error: {},
        details: {
          google: {
            status: 'up',
            message: 'Google is up',
          },
        },
      };

      const mockHttpCheck = jest.fn().mockResolvedValue({
        google: {
          status: 'up',
          message: 'Google is up',
        },
      });

      httpHealthIndicator.pingCheck.mockImplementation(mockHttpCheck);
      healthCheckService.check.mockResolvedValue(expectedResult as any);

      // Act
      const result = await controller.getHealthCheck();

      // Assert
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
      expect(result).toEqual(expectedResult);
    });
  });
});
