import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

// Thrown by integration modules when a third-party provider call fails.
// Business modules must only ever see this exception, never the raw provider error -
// `details` carries that raw error message through anyway (surfaced in the API
// response by GlobalExceptionFilter), since suppressing it entirely made real failures
// hard to diagnose from outside the server logs. Pass it whenever you have it.
//
// Note: Pimlico/1inch/LiFi/chain-RPC no longer use this - their clients throw
// ProviderHttpError directly and GlobalExceptionFilter handles that natively (see
// error.util.ts). This class is still used by the other integrations (Turnkey, Safe,
// Sumsub, Rain, Relayer, Baanx) that haven't been migrated to that pattern.
export class ProviderException extends AppException {
  constructor(
    public readonly provider: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
    public readonly details?: string,
    public readonly providerStatus?: number,
  ) {
    super(message, statusCode, 'PROVIDER_ERROR');
  }
}