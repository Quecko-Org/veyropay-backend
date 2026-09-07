import { Injectable, Logger } from '@nestjs/common';
import { LifiClient } from './lifi.client';
import { ILifiQuoteRequest, ILifiQuoteResponse, ILifiStatusResponse } from './types';

// Business modules depend on this service, never on LifiClient directly.
//
// getQuote just logs context then rethrows the caught error as-is - LifiClient
// already throws ProviderHttpError (the real LiFi HTTP status + body) for anything
// that fails, and GlobalExceptionFilter turns that into a proper API response (real
// status/code, not a blind 502) without this layer needing to re-wrap anything.
@Injectable()
export class LifiService {
  private readonly logger = new Logger(LifiService.name);

  constructor(private readonly client: LifiClient) {}

  async getQuote(request: ILifiQuoteRequest): Promise<ILifiQuoteResponse> {
    try {
      return await this.client.getQuote(request);
    } catch (error) {
      this.logger.warn({ err: error }, 'LiFi quote request failed');
      throw error;
    }
  }

  // Returns null (not a throw) on failure - callers poll this in a loop, so a
  // transient error should just be retried on the next attempt rather than aborting.
  async getStatus(
    txHash: string,
    fromChain?: string,
    toChain?: string,
  ): Promise<ILifiStatusResponse | null> {
    try {
      return await this.client.getStatus(txHash, fromChain, toChain);
    } catch (error) {
      this.logger.warn({ err: error }, 'LiFi status lookup failed');
      return null;
    }
  }
}