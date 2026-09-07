import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { ISwapFeeConfig } from '@core/config/swap.config';
import { ProviderHttpError } from '@common/utils';
import { ILifiQuoteRequest, ILifiQuoteResponse, ILifiStatusResponse } from './types';

// Thin HTTP client wrapper around the LiFi API (cross-chain routing).
// See https://apidocs.li.fi
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

    // LiFi's `fee` is a FRACTION (0.005 = 0.5%), not a percentage like 1inch's -
    // and requires a registered `integrator` string tied to a fee wallet configured
    // on LiFi's own dashboard. See docs.li.fi/monetization-take-fees.
    if (this.swapFeeConfig.percentage > 0 && this.swapFeeConfig.lifiIntegratorId) {
      query.set('fee', String(this.swapFeeConfig.percentage / 100));
      query.set('integrator', this.swapFeeConfig.lifiIntegratorId);
    }

    return this.request<ILifiQuoteResponse>(`/quote?${query}`);
  }

  // Tracks the actual cross-chain bridge transfer, separate from the source-chain
  // transaction itself - see docs.li.fi/li.fi-api/li.fi-api/status-of-a-transaction.
  // Passing fromChain/toChain is optional but speeds up the lookup.
  async getStatus(
    txHash: string,
    fromChain?: string,
    toChain?: string,
  ): Promise<ILifiStatusResponse> {
    const query = new URLSearchParams({ txHash });
    if (fromChain) {
      query.set('fromChain', fromChain);
    }
    if (toChain) {
      query.set('toChain', toChain);
    }

    return this.request<ILifiStatusResponse>(`/status?${query}`);
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
        const errorBody = await response.text();
        throw new ProviderHttpError(
          `Lifi request failed with status ${response.status}: ${errorBody}`,
          response.status,
          errorBody,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}