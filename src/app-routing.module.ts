import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { HealthCheckModule } from './common/modules/health-check/health-check.module';
import { AuthModule } from './common/modules/auth/auth.module';
import { PrismaModule } from './common/shared/prisma/prisma.module';
import { ProjectsModule } from './common/modules/projects/projects.module';
import { TasksModule } from './common/modules/tasks/tasks.module';

const routes: Routes = [
  { path: '/health-check', module: HealthCheckModule },
  { path: '/auth', module: AuthModule },
  { path: '/projects', module: ProjectsModule },
  { path: '/tasks', module: TasksModule },
];

@Module({
  imports: [
    RouterModule.register(routes),
    HealthCheckModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    PrismaModule,
  ],
})
export class AppRoutingModule {}
