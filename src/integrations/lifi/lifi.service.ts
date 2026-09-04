import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { LifiClient } from './lifi.client';
import { LIFI_PROVIDER_NAME } from './constants';
import { ILifiQuoteRequest, ILifiQuoteResponse, ILifiStatusResponse } from './types';
// Business modules depend on this service, never on LifiClient directly.
@Injectable()
export class LifiService {
  private readonly logger = new Logger(LifiService.name);

  constructor(private readonly client: LifiClient) {}

  async getQuote(request: ILifiQuoteRequest): Promise<ILifiQuoteResponse> {
    try {
      console.log('LIFIII');

      return await this.client.getQuote(request);
    } catch (error) {
      this.logger.warn({ err: error }, 'LiFi quote request failed');
      throw new ProviderException(
        LIFI_PROVIDER_NAME,
        'Unable to fetch cross-chain route',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ...inside the class, after getQuote:
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
