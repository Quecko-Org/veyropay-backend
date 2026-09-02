import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ProviderException extends AppException {
  constructor(
    public readonly provider: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
    public readonly providerCause?: unknown,
  ) {
    super(message, statusCode, 'PROVIDER_ERROR');
  }
}
