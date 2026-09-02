import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { OneinchClient } from './oneinch.client';
import {
  IOneinchQuoteRequest,
  IOneinchQuoteResponse,
  IOneinchSwapRequest,
  IOneinchSwapResponse,
} from './types';
import { ONEINCH_PROVIDER_NAME } from './constants';
import { ConfigService } from '@nestjs/config';
import { ISwapFeeConfig } from '@app/core/config/swap.config';

// Business modules depend on this service, never on OneinchClient directly.
@Injectable()
export class OneinchService {
  private readonly logger = new Logger(OneinchService.name);
  private readonly config: ISwapFeeConfig;

  constructor(
    private readonly client: OneinchClient,
    configService: ConfigService,
  ) {
    this.config = configService.get<ISwapFeeConfig>('swapFee') as ISwapFeeConfig;
  }

  async getQuote(request: IOneinchQuoteRequest): Promise<IOneinchQuoteResponse> {
    try {
      return await this.client.getQuote(request);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch quote request failed');
      throw new ProviderException(
        ONEINCH_PROVIDER_NAME,
        'Unable to fetch swap quote',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getSwapTransaction(request: IOneinchSwapRequest): Promise<IOneinchSwapResponse> {
    try {
      return await this.client.getSwapTransaction(request);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch swap transaction request failed');
      throw new ProviderException(
        ONEINCH_PROVIDER_NAME,
        'Unable to build swap transaction',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
