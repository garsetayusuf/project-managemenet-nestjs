import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RemoveEmptyStringInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    if (req.body) {
      for (const field of Object.keys(req.body)) {
        if (req.body[field] === '') {
          req.body[field] = null;
        }
      }
    }
    return next.handle();
  }
}
