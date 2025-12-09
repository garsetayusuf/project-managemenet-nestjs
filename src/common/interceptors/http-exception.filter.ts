import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    let error = null;

    if (typeof errorResponse === 'object' && errorResponse !== null) {
      error = (errorResponse as any).error || null;
    }

    const responsePayload = {
      status: 'failed',
      statusCode: status,
      message: exception.message || 'Internal server error',
      data: null,
      error,
    };
    console.log(
      '🚀 ~ HttpExceptionFilter ~ catch ~ responsePayload:',
      responsePayload,
    );

    response.status(status).send(responsePayload);
  }
}
