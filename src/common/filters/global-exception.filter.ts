import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { IApiErrorResponse } from '@shared/responses';
import { ProviderException } from '@common/exceptions';
import { ProviderHttpError } from '@common/utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error, details, providerStatus, providerCode } =
      this.resolveException(exception);

    const errorResponse: IApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      ...(details ? { details } : {}),
      ...(providerStatus !== undefined ? { providerStatus } : {}),
      ...(providerCode !== undefined ? { providerCode } : {}),
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
    details?: string;
    providerStatus?: number;
    providerCode?: string | number;
  } {
    // Thrown directly by the provider HTTP/RPC clients (PimlicoClient, OneinchClient,
    // LifiClient, ChainRpcClient) - no service-layer wrapping required to surface the
    // real status. An HTTP provider (1inch, LiFi) reports a real HTTP status, so pass
    // it straight through as our own statusCode too. Pimlico's bundler (and any raw
    // eth_call) reports failures as a JSON-RPC error code inside a 200 OK (never a real
    // 4xx/5xx), so that code isn't a valid HTTP status - fall back to 502 for those, but
    // it's still visible in `providerStatus`.
    if (exception instanceof ProviderHttpError) {
      const isHttpStatus = exception.status >= 100 && exception.status <= 599;

      return {
        statusCode: isHttpStatus ? exception.status : HttpStatus.BAD_GATEWAY,
        message: exception.message,
        error: 'ProviderError',
        details: exception.body,
        providerStatus: exception.status,
        providerCode: this.extractProviderCode(exception.body),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      const base =
        typeof body === 'string'
          ? { statusCode: status, message: body, error: exception.name }
          : this.resolveHttpExceptionBody(exception, status, body);

      return {
        ...base,
        // Older/other call sites (Turnkey, Safe, Sumsub, ...) still throw the wrapped
        // ProviderException with pre-extracted details/providerStatus - still honored.
        ...(exception instanceof ProviderException && exception.details
          ? { details: exception.details }
          : {}),
        ...(exception instanceof ProviderException && exception.providerStatus !== undefined
          ? { providerStatus: exception.providerStatus }
          : {}),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private resolveHttpExceptionBody(
    exception: HttpException,
    status: number,
    body: object,
  ): { statusCode: number; message: string; error: string } {
    const bodyObject = body as { message?: string | string[]; error?: string };
    const message = Array.isArray(bodyObject.message)
      ? bodyObject.message.join(', ')
      : (bodyObject.message ?? exception.message);

    return { statusCode: status, message, error: bodyObject.error ?? exception.name };
  }

  // Pulls the provider's own machine-readable error code out of its raw response body,
  // when it has one - e.g. 1inch's `"code":"NOT_ENOUGH_ALLOWANCE"` (string) or LiFi's
  // `"code":1011` (number). Not every provider includes one, and not every failure body
  // is even JSON (a plain-text 502 from an upstream proxy, for instance) - returns
  // undefined rather than throwing for any of those cases.
  private extractProviderCode(body?: string): string | number | undefined {
    if (!body) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(body) as { code?: string | number };
      return parsed.code;
    } catch {
      return undefined;
    }
  }
}