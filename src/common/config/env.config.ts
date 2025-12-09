import { EnvironmentEnum } from '../enum/environment.enum';
import { config as configDotenv } from 'dotenv';
import { EnvConfiguration } from '../interfaces/env.interface';

configDotenv();

export const loadConfig: () => EnvConfiguration = () => ({
  environment:
    (process.env.NODE_ENV as EnvironmentEnum) || EnvironmentEnum.Development,
  port: parseInt(process.env.PORT || '21352'),
  cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost'] },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expires: process.env.JWT_EXPIRES || '15m',
    expiresRefreshToken: process.env.JWT_EXPIRES_REFRESH_TOKEN || '7d',
  },
  auth: {
    passwordSaltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '10'),
  },
});
