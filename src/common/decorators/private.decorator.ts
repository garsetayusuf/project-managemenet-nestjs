import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function IsPrivate() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Token missing, invalid, or expired',
      example: {
        status: 'failed',
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Token missing, invalid, or expired',
        data: null,
        error: 'Unauthorized',
      },
    }),
    ApiForbiddenResponse({
      description: 'Access denied',
      example: {
        status: 'failed',
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        data: null,
        error: 'Forbidden',
      },
    }),
  );
}
