import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { ISwapFeeConfig } from '@core/config/swap.config';
import { ILifiQuoteRequest, ILifiQuoteResponse } from './types';

@Injectable()
export class LifiClient {
  private readonly config: IProviderConfig;
  private readonly swapFeeConfig: ISwapFeeConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('lifi') as IProviderConfig;
    this.swapFeeConfig = configService.get<ISwapFeeConfig>('swapFee') as ISwapFeeConfig;
  }

  async getQuote(request: ILifiQuoteRequest): Promise<ILifiQuoteResponse> {
    const query = new URLSearchParams({
      fromChain: request.fromChain,
      toChain: request.toChain,
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
    });

    if (this.swapFeeConfig.percentage > 0 && this.swapFeeConfig.lifiIntegratorId) {
      query.set('fee', String(this.swapFeeConfig.percentage / 100));
      query.set('integrator', this.swapFeeConfig.lifiIntegratorId);
    }

    return this.request<ILifiQuoteResponse>(`/quote?${query}`);
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          'x-lifi-api-key': this.config.apiKey,
          Accept: 'application/json',
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Lifi request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}