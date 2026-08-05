import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { IApiErrorResponse } from '@shared/responses';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveException(exception);

    const errorResponse: IApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as unknown as { id?: string }).id,
    };

    const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;

    if (statusCode >= internalServerErrorStatus) {
      this.logger.error({ err: exception, ...errorResponse }, 'Unhandled exception');
    } else {
      this.logger.warn(errorResponse, 'Request failed');
    }

    response.status(statusCode).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { statusCode: status, message: body, error: exception.name };
      }

      const bodyObject = body as { message?: string | string[]; error?: string };
      const message = Array.isArray(bodyObject.message)
        ? bodyObject.message.join(', ')
        : (bodyObject.message ?? exception.message);

      return {
        statusCode: status,
        message,
        error: bodyObject.error ?? exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
