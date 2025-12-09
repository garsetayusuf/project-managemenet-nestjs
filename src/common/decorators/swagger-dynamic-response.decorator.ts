import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Mapping of exception types to their API response configurations
const exceptionResponses = {
  InternalServerErrorException: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal Server Error.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong. Please try again later.',
      data: null,
      error: 'Internal Server Error',
    },
  },
  NotFoundException: {
    status: HttpStatus.NOT_FOUND,
    description: 'Resource Not Found.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.NOT_FOUND,
      message: 'The requested resource could not be found.',
      data: null,
      error: 'Resource Not Found',
    },
  },
  BadRequestException: {
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid Request.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'The request was invalid or cannot be processed.',
      data: null,
      error: 'Bad Request',
    },
  },
  ForbiddenException: {
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.FORBIDDEN,
      message: 'You do not have permission to access this resource.',
      data: null,
      error: 'Forbidden',
    },
  },
  UnauthorizedException: {
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'You need to be logged in to access this resource.',
      data: null,
      error: 'Unauthorized',
    },
  },
  ConflictException: {
    status: HttpStatus.CONFLICT,
    description: 'Conflict.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.CONFLICT,
      message: 'There was a conflict with the request.',
      data: null,
      error: 'Conflict',
    },
  },
  UnprocessableEntityException: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Unprocessable Entity.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message:
        'The request was well-formed but was unable to be followed due to semantic errors.',
      data: null,
      error: 'Unprocessable Entity',
    },
  },
  NotAcceptableException: {
    status: HttpStatus.NOT_ACCEPTABLE,
    description: 'Not Acceptable.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.NOT_ACCEPTABLE,
      message:
        'The requested resource is capable of generating only content not acceptable according to the Accept headers sent in the request.',
      data: null,
      error: 'Not Acceptable',
    },
  },
  MethodNotAllowedException: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    description: 'Method Not Allowed.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.METHOD_NOT_ALLOWED,
      message:
        'The method specified in the request is not allowed for the resource identified by the request URI.',
      data: null,
      error: 'Method Not Allowed',
    },
  },
  RequestTimeoutException: {
    status: HttpStatus.REQUEST_TIMEOUT,
    description: 'Request Timeout.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.REQUEST_TIMEOUT,
      message: 'The server timed out waiting for the request.',
      data: null,
      error: 'Request Timeout',
    },
  },
  ServiceUnavailableException: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service Unavailable.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message:
        'The server is currently unable to handle the request due to temporary overloading or maintenance of the server.',
      data: null,
      error: 'Service Unavailable',
    },
  },
  GatewayTimeoutException: {
    status: HttpStatus.GATEWAY_TIMEOUT,
    description: 'Gateway Timeout.',
    example: {
      status: 'failed',
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      message:
        'The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server.',
      data: null,
      error: 'Gateway Timeout',
    },
  },
};

export function DynamicApiExceptions(
  serviceMethod: Type<unknown> | Function | [Function] | string,
) {
  const decorators = [
    ApiResponse(exceptionResponses.InternalServerErrorException),
  ];

  for (const [exceptionName, response] of Object.entries(exceptionResponses)) {
    if (serviceMethod.toString().includes(exceptionName)) {
      decorators.push(ApiResponse(response));
    } else if (serviceMethod.toString().includes(exceptionName)) {
      decorators.push(ApiResponse(response));
    }
  }

  return applyDecorators(...decorators);
}
