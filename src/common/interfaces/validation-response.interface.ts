import { HttpExceptionBody } from '@nestjs/common/interfaces';

export interface ValidationResponse extends HttpExceptionBody {
  message: string | string[];
}
