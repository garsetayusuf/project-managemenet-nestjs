import { Logger, LoggerService } from '@nestjs/common';
import ansis from 'ansis';

export class CustomLogger extends Logger implements LoggerService {
  logRequest(message: string) {
    super.log(ansis.blueBright(message));
  }

  logResponse(message: string) {
    super.log(ansis.greenBright(message));
  }
}
