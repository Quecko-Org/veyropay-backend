import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { LifiClient } from './lifi.client';
import { ILifiQuoteRequest, ILifiQuoteResponse } from './types';
import { LIFI_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on LifiClient directly.
@Injectable()
export class LifiService {
  private readonly logger = new Logger(LifiService.name);

  constructor(private readonly client: LifiClient) {}

  async getQuote(request: ILifiQuoteRequest): Promise<ILifiQuoteResponse> {
    try {
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
}
