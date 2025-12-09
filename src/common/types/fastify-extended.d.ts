import { FastifyRequest as OriginalFastifyRequest } from 'fastify';

declare module 'fastify' {
  export interface FastifyRequest extends OriginalFastifyRequest {
    logFullDetails?: (body: any) => void;
  }
}
