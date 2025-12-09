import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { IsPublic } from 'src/common/decorators/public.decorator';
import { PrismaService } from 'src/common/shared/prisma/prisma.service';
import { camelCaseToWords } from 'src/helpers/transform-camel-case';

@ApiTags(camelCaseToWords(HealthCheckController.name))
@Controller()
export class HealthCheckController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: PrismaHealthIndicator,
    // private prisma: PrismaService,
  ) {}

  @IsPublic()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check health' })
  getHealthCheck() {
    return this.health.check([
      () => this.http.pingCheck('google', 'https://google.com'),
      // () => this.db.pingCheck('prisma', this.prisma),
    ]);
  }
}
