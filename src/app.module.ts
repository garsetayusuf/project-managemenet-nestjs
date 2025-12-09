import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './common/config/env.config';
import { JwtModule } from '@nestjs/jwt';
import { HttpLoggerModule } from './common/middleware/http-logger.module';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { AppRoutingModule } from './app-routing.module';
import { PrismaModule } from './common/shared/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    AppRoutingModule,
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    JwtModule.register({
      secret: loadConfig().jwt.secret,
      signOptions: { expiresIn: loadConfig().jwt.expires as any },
      global: true,
    }),
    HttpLoggerModule,
    NestjsFormDataModule.config({ isGlobal: true }),
    PrismaModule,
    HttpModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
    Reflector,
  ],
})
export class AppModule {}
