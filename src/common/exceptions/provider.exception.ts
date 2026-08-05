import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

// Thrown by integration modules when a third-party provider call fails.
// Business modules must only ever see this exception, never the raw provider error.
export class ProviderException extends AppException {
  constructor(
    public readonly provider: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super(message, statusCode, 'PROVIDER_ERROR');
  }
}
