import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Project Management API')
    .setDescription(
      'This is the API documentation for Project Management, providing details on all available endpoints, request/response formats, and authentication methods.',
    )
    .setVersion('0.0.1')
    .addBearerAuth({
      description: 'JWT token',
      type: 'http',
    })
    .setExternalDoc('Postman Collection', '/swagger-json')
    .build();
  const theme = new SwaggerTheme();
  const options: SwaggerCustomOptions = {
    explorer: false,
    customCss: theme.getBuffer(SwaggerThemeNameEnum.CLASSIC),
  };

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, options);
}
