import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';
import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResponse } from '../interfaces/validation-response.interface';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from 'generated/prisma/internal/prismaNamespace';

type ApiResponse<T> = {
  status: 'success' | 'failed';
  statusCode: number;
  message: string;
  error?: string[] | string | null;
  data: T | null;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    return next.handle().pipe(
      map((res: unknown) =>
        this.responseHandler(res, context, traceId, startTime),
      ),
      catchError(
        (
          err:
            | HttpException
            | PrismaClientKnownRequestError
            | PrismaClientUnknownRequestError
            | PrismaClientValidationError
            | Error,
        ) => {
          const transformedError = this.errorHandler(err, context, traceId);
          return throwError(() => transformedError);
        },
      ),
    );
  }

  private errorHandler(
    exception:
      | HttpException
      | PrismaClientKnownRequestError
      | PrismaClientUnknownRequestError
      | PrismaClientValidationError
      | Error,
    context: ExecutionContext,
    traceId: string,
  ) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | string[] | null = null;
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const responseBody = res as ValidationResponse;
        message = Array.isArray(responseBody.message)
          ? responseBody.message.join(', ')
          : responseBody.message || message;
        error = (res as any).error || null;
      } else if (typeof res === 'string') {
        message = res;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      const userError = this.mapPrismaToUserError(exception);
      const prismaError = this.getPrismaErrorStatus(exception.code);

      if (userError) {
        status = userError.status;
        message = userError.message;
        errorCode = exception.code;
        error = userError.error;

        this.logger.warn({
          traceId,
          message,
          code: exception.code,
          error: prismaError,
          path: request.url,
          method: request.method,
          userAgent: request.headers['user-agent'],
        });
      }
    } else if (exception instanceof PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid input data provided';
      error = 'Validation Error';

      const validationMessage = this.extractValidationMessage(
        exception.message,
      );

      this.logger.error({
        traceId,
        message: validationMessage ?? exception.message,
        stack: exception.stack,
      });
    } else if (exception instanceof PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected database error occurred';
      error = 'Prisma Unknown Error';

      this.logger.error({
        traceId,
        fullMessage: exception.message,
        stack: exception.stack,
      });
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : exception.message;
      error = 'Server Error';

      this.logger.error({
        traceId,
        message: exception.message,
        name: exception.name,
        stack: exception.stack,
      });
    }

    const responsePayload: ApiResponse<null> = {
      status: 'failed',
      statusCode: status,
      message,
      data: null,
      error,
    };

    return new HttpException(responsePayload, status);
  }

  private responseHandler(
    res: any,
    context: ExecutionContext,
    traceId: string,
    startTime: number,
  ): ApiResponse<T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const statusCode = HttpStatus.OK;
    const duration = Date.now() - startTime;

    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_METADATA,
        context.getHandler(),
      ) || 'Success';

    const responseData = this.processResponseData(res);

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Success [${traceId}]: ${request.method} ${request.url} - ${duration}ms`,
      );
    }

    return {
      status: 'success',
      statusCode,
      message,
      data: responseData.data,
    };
  }

  private mapPrismaToUserError(
    error: PrismaClientKnownRequestError,
  ): { status: number; message: string; error: string } | null {
    const { code, meta } = error;

    switch (code) {
      // Unique constraint violations - Common user errors
      case 'P2002': {
        const target = meta?.target as string[] | string;
        const field = Array.isArray(target) ? target[0] : target;

        // Map common fields to user-friendly messages
        const fieldMessages: Record<string, string> = {
          email: 'An account with this email already exists',
          username: 'This username is already taken',
          phone: 'This phone number is already registered',
          slug: 'This URL slug is already in use',
        };

        const message =
          fieldMessages[field] ||
          'This value already exists and must be unique';
        return {
          status: HttpStatus.CONFLICT,
          message,
          error: HttpStatus[HttpStatus.CONFLICT],
        };
      }

      // Record not found - When user tries to access non-existent data
      case 'P2001':
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested resource was not found',
          error: HttpStatus[HttpStatus.NOT_FOUND],
        };

      // Foreign key constraint - User trying to reference non-existent data
      case 'P2003': {
        const field = meta?.field_name as string;
        const fieldMessages: Record<string, string> = {
          user_id: 'Invalid user reference',
          category_id: 'Invalid category selected',
          restaurant_id: 'Invalid restaurant reference',
        };

        const message =
          fieldMessages[field] || 'Invalid reference to related data';
        return {
          status: HttpStatus.BAD_REQUEST,
          message,
          error: HttpStatus[HttpStatus.BAD_REQUEST],
        };
      }

      // Required field missing
      case 'P2011': {
        const field = meta?.constraint as string;
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `${field || 'Required field'} cannot be empty`,
          error: HttpStatus[HttpStatus.BAD_REQUEST],
        };
      }

      // Value too long
      case 'P2000': {
        const field = meta?.column_name as string;
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `${field || 'Field'} value is too long`,
          error: HttpStatus[HttpStatus.BAD_REQUEST],
        };
      }

      // Invalid value for field type
      case 'P2005':
      case 'P2006':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format provided',
          error: HttpStatus[HttpStatus.BAD_REQUEST],
        };

      // Connection/timeout errors that users might encounter
      case 'P2024': // Connection pool timeout
      case 'P5009': // Request timeout
        return {
          status: HttpStatus.REQUEST_TIMEOUT,
          message: 'Request timed out. Please try again.',
          error: HttpStatus[HttpStatus.REQUEST_TIMEOUT],
        };

      // Rate limiting
      case 'P5008':
        return {
          status: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: HttpStatus[HttpStatus.TOO_MANY_REQUESTS],
        };

      // All other errors are internal server errors
      default:
        return null; // Will be handled as 500 Internal Server Error
    }
  }

  private processResponseData(res: any): { data: any; pagination?: any } {
    // Handle null, undefined, or primitive responses
    if (res === null || res === undefined) {
      return { data: null };
    }

    if (typeof res !== 'object') {
      return { data: res };
    }

    // Handle arrays directly (your case: return [{id:1}])
    if (Array.isArray(res)) {
      return { data: res };
    }

    // Handle objects with 'data' property but no pagination
    if (res.data && !res.pagination) {
      // Check if meta contains pagination fields
      const pagination =
        res.meta && (res.meta.total || res.meta.total === 0)
          ? res.meta
          : undefined;
      return { data: res.data, pagination };
    }

    // Handle regular objects (your case: return {id: 1})
    return { data: res };
  }

  private generateTraceId(): string {
    return uuidv4();
  }

  // Get appropriate HTTP status code based on Prisma error code
  private getPrismaErrorStatus(code: string): number {
    // Client errors (400-level)
    const clientErrors = [
      'P2000',
      'P2001',
      'P2002',
      'P2003',
      'P2004',
      'P2005',
      'P2006',
      'P2007',
      'P2008',
      'P2009',
      'P2011',
      'P2012',
      'P2013',
      'P2014',
      'P2015',
      'P2016',
      'P2017',
      'P2018',
      'P2019',
      'P2020',
      'P2023',
      'P2025',
      'P2026',
      'P2029',
      'P2030',
      'P2033',
      'P5000',
      'P5002',
      'P5003',
      'P5007',
      'P5011',
      'P6001',
      'P6002',
      'P6010',
      'P6013',
      'P6015',
    ];

    // Server errors that should be 404 (Not Found)
    const notFoundErrors = ['P2001', 'P2025', 'P5003'];

    // Conflict errors (409)
    const conflictErrors = ['P2002', 'P2014', 'P2034'];

    // Unauthorized errors (401)
    const unauthorizedErrors = ['P5007', 'P6010', 'P6013'];

    // Timeout errors (408)
    const timeoutErrors = ['P2024', 'P5009', 'P6004', 'P6006', 'P6101'];

    // Too many requests (429)
    const rateLimitErrors = ['P5008', 'P6102'];

    if (notFoundErrors.includes(code)) {
      return HttpStatus.NOT_FOUND;
    }
    if (conflictErrors.includes(code)) {
      return HttpStatus.CONFLICT;
    }
    if (unauthorizedErrors.includes(code)) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (timeoutErrors.includes(code)) {
      return HttpStatus.REQUEST_TIMEOUT;
    }
    if (rateLimitErrors.includes(code)) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }
    if (clientErrors.includes(code)) {
      return HttpStatus.BAD_REQUEST;
    }

    // Default to 500 for server errors
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  // Extract meaningful message from Prisma validation errors
  private extractValidationMessage(fullMessage: string): string | null {
    try {
      // Common patterns in Prisma validation errors
      const patterns = [
        /Argument `(\w+)` is missing/,
        /Unknown argument `(\w+)`/,
        /Argument `(\w+)`: Invalid value provided/,
        /Invalid `.*` provided to `(\w+)`/,
        /Expected (\w+), provided (\w+)/,
      ];

      for (const pattern of patterns) {
        const match = fullMessage.match(pattern);
        if (match) {
          return `Invalid field: ${match[1] || 'unknown'}`;
        }
      }

      // If no pattern matches, try to extract the first meaningful line
      const lines = fullMessage.split('\n').filter((line) => line.trim());
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine && !firstLine.startsWith('Invalid `')) {
          return firstLine;
        }
      }
    } catch (error) {
      // If parsing fails, return null to use default message
      return null;
    }

    return null;
  }
}
