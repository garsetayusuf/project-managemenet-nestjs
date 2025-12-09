import { HttpCode, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, getSchemaPath } from '@nestjs/swagger';
import 'reflect-metadata';

export function ApiResponseDto<T>(
  type: Type<T> | [Type<T>],
  option: {
    responseMessage: string;
    summary: string;
    statusCode?: number;
    isPagination?: boolean;
  },
) {
  return (target: any, propertyKey: string, descriptor?: any) => {
    const isArray = Array.isArray(type);
    const actualType = isArray ? (type as [Type<T>])[0] : (type as Type<T>);

    let finalStatusCode = option?.statusCode;
    if (!finalStatusCode) {
      finalStatusCode = HttpStatus.OK;
    }

    const responses: any = {
      [finalStatusCode]: {
        description: option.responseMessage,
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            data: isArray
              ? {
                  type: 'array',
                  items: { $ref: getSchemaPath(actualType) },
                }
              : { $ref: getSchemaPath(actualType) },
            message: {
              type: 'string',
              example: option.responseMessage,
            },
            statusCode: {
              type: 'number',
              example: finalStatusCode,
            },
          },
        },
      },
    };

    Reflect.defineMetadata('swagger/apiResponse', responses, descriptor.value);
    ApiExtraModels(actualType)(target, propertyKey, descriptor);
    ApiOperation({ summary: option.summary })(target, propertyKey, descriptor);
    HttpCode(finalStatusCode)(target, propertyKey, descriptor);
  };
}
