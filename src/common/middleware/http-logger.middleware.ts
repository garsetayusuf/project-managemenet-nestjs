import { Injectable } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { js_beautify } from 'js-beautify';
import { loadConfig } from '../config/env.config';
import { EnvironmentEnum } from '../enum/environment.enum';
import JsonTruncator from 'json-truncator';
import { CustomLogger } from 'src/helpers/custom-logger';

@Injectable()
export class HttpLoggerMiddleware {
  private readonly customLogger = new CustomLogger('HttpLoggerMiddleware');

  onRequest(request: FastifyRequest, reply: FastifyReply, done: () => void) {
    const { method, query: queryParams, url: path } = request;

    if (path.startsWith('/api/')) {
      request.logFullDetails = (body: any) => {
        const requestLog = {
          method,
          path,
          queryParams,
          body,
        };

        this.customLogger.log(
          `Request: ${js_beautify(JSON.stringify(requestLog))}`,
        );
      };
    }

    done();
  }

  preHandler(request: FastifyRequest, reply: FastifyReply, done: () => void) {
    if (request.logFullDetails) {
      request.logFullDetails(request.body);
    }

    done();
  }

  onSend(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: any,
    done: () => void,
  ) {
    const { method, url: path } = request;
    let parsedPayload: any;

    if (path.startsWith('/api/')) {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        parsedPayload = payload; // If it's not JSON, use the original payload
      }

      const responseLog = {
        method,
        path,
        statusCode: reply.statusCode,
        body:
          loadConfig().environment === EnvironmentEnum.Development
            ? parsedPayload
            : JsonTruncator.truncate(parsedPayload, 5),
      };

      this.customLogger.log(
        `Response: ${js_beautify(JSON.stringify(responseLog))}`,
      );
    }

    done();
  }
}
