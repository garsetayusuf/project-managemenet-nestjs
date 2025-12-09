import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '../src/common/config/env.config';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  await ConfigModule.forRoot({
    isGlobal: true,
    load: [loadConfig],
  });
});

global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

global.mockRequest = (overrides = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'OWNER',
  },
  ...overrides,
});

afterEach(() => {
  jest.clearAllMocks();
});
