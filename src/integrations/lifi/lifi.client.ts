import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { ILifiQuoteRequest, ILifiQuoteResponse } from './types';

// Thin HTTP client wrapper around the LiFi API (cross-chain routing).
// See https://apidocs.li.fi
@Injectable()
export class LifiClient {
  private readonly config: IProviderConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('lifi') as IProviderConfig;
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
