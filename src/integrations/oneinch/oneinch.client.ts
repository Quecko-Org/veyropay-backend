import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import {
  IOneinchQuoteRequest,
  IOneinchQuoteResponse,
  IOneinchSwapRequest,
  IOneinchSwapResponse,
} from './types';

// Thin HTTP client wrapper around the 1inch Swap API (same-chain swaps only).
// See https://portal.1inch.dev/documentation/swap/swagger
@Injectable()
export class OneinchClient {
  private readonly config: IProviderConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('oneinch') as IProviderConfig;
  }

  async getQuote(request: IOneinchQuoteRequest): Promise<IOneinchQuoteResponse> {
    const query = new URLSearchParams({
      src: request.src,
      dst: request.dst,
      amount: request.amount,
    });

    return this.request<IOneinchQuoteResponse>(`/swap/v6.0/${request.chainId}/quote?${query}`);
  }

  async getSwapTransaction(request: IOneinchSwapRequest): Promise<IOneinchSwapResponse> {
    const query = new URLSearchParams({
      src: request.src,
      dst: request.dst,
      amount: request.amount,
      from: request.from,
      slippage: String(request.slippage),
    });

    return this.request<IOneinchSwapResponse>(`/swap/v6.0/${request.chainId}/swap?${query}`);
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Oneinch request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
