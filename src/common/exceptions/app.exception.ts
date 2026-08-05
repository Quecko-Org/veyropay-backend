import { HttpException, HttpStatus } from '@nestjs/common';

// Base application exception. All domain-specific exceptions should extend this
// so the global exception filter can format them consistently.
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode: string = 'APP_ERROR',
  ) {
    super(message, statusCode);
  }
}
