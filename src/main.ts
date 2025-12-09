import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EnvironmentEnum } from './common/enum/environment.enum';
import { loadConfig } from './common/config/env.config';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { setupSwagger } from './common/config/swagger.config';
import helmet from '@fastify/helmet';
import csrf from '@fastify/csrf-protection';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CustomLogger } from './helpers/custom-logger';
import { HttpExceptionFilter } from './common/interceptors/http-exception.filter';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const logger = new CustomLogger('NestApplication');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger:
        process.env.NODE_ENV === EnvironmentEnum.Development
          ? ['log', 'error', 'warn', 'debug', 'verbose']
          : ['log', 'error', 'warn'],
    },
  );

  const config = loadConfig();
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const httpLoggerMiddleware = app.get(HttpLoggerMiddleware);

  app.setGlobalPrefix('/api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS configuration
  app.enableCors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Middleware hooks for logging
  fastifyInstance.addHook(
    'onRequest',
    httpLoggerMiddleware.onRequest.bind(httpLoggerMiddleware),
  );
  fastifyInstance.addHook(
    'preHandler',
    httpLoggerMiddleware.preHandler.bind(httpLoggerMiddleware),
  );
  fastifyInstance.addHook(
    'onSend',
    httpLoggerMiddleware.onSend.bind(httpLoggerMiddleware),
  );

  // Enable Swagger only when it's not Production
  if (config.environment !== EnvironmentEnum.Production) {
    setupSwagger(app);
  }

  // Helmet configuration - security headers
  await fastifyInstance.register(helmet as any);

  // Cross-site request forgery protection
  await fastifyInstance.register(csrf as any);

  // Multipart form data parsing
  await fastifyInstance.register(multipart as any);

  // Response compression
  await fastifyInstance.register(compress as any);

  await fastifyInstance.register(fastifyCookie as any);

  // Start listening for shutdown hooks
  // This is recommended for containerised deployments to handle graceful shutdown events like SIGTERM.
  app.enableShutdownHooks();

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.log(`Application is running on: http://0.0.0.0:${config.port}`);
}
bootstrap();
