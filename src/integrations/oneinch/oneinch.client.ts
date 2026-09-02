import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { ISwapFeeConfig } from '@core/config/swap.config';

import {
  IOneinchQuoteRequest,
  IOneinchQuoteResponse,
  IOneinchSwapRequest,
  IOneinchSwapResponse,
  IOneinchAllowanceResponse,
  IOneinchApprovalTransactionResponse,
} from './types';

@Injectable()
export class OneinchClient {
  private readonly config: IProviderConfig;
  private readonly swapFeeConfig: ISwapFeeConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('oneinch') as IProviderConfig;
    this.swapFeeConfig = configService.get<ISwapFeeConfig>('swapFee') as ISwapFeeConfig;
  }

  private applySwapFee(query: URLSearchParams): void {
    if (this.swapFeeConfig.percentage > 0 && this.swapFeeConfig.recipientAddress) {
      query.set('fee', String(this.swapFeeConfig.percentage));
      query.set('referrer', this.swapFeeConfig.recipientAddress);
    }
  }







  
  // ...inside the class:
  async getAllowance(
    chainId: number,
    tokenAddress: string, 
    walletAddress: string,
  ): Promise<IOneinchAllowanceResponse> {
    const query = new URLSearchParams({ tokenAddress, walletAddress });
    return this.request<IOneinchAllowanceResponse>(
      `/swap/v6.0/${chainId}/approve/allowance?${query}`,
    );
  }
  
  async getApprovalTransaction(
    chainId: number,
    tokenAddress: string,
    amount?: string,
  ): Promise<IOneinchApprovalTransactionResponse> {
    const query = new URLSearchParams({ tokenAddress });
    if (amount) {
      query.set('amount', amount);
    }
    return this.request<IOneinchApprovalTransactionResponse>(
      `/swap/v6.0/${chainId}/approve/transaction?${query}`,
    );
  }

  async getQuote(request: IOneinchQuoteRequest): Promise<IOneinchQuoteResponse> {
    const query = new URLSearchParams({
      src: request.src,
      dst: request.dst,
      amount: request.amount,
    });
    this.applySwapFee(query);

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
    this.applySwapFee(query);

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
        const errorBody = await response.text();

        throw new Error(`1inch request failed with status ${response.status}: ${errorBody}`);      
      }
// console.log("request response",path,init,await response.json());
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    } 
  }
}