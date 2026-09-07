import { Injectable, Logger } from '@nestjs/common';
import { OneinchClient } from './oneinch.client';
import {
  IOneinchAllowanceResponse,
  IOneinchApprovalTransactionResponse,
  IOneinchQuoteRequest,
  IOneinchQuoteResponse,
  IOneinchSwapRequest,
  IOneinchSwapResponse,
} from './types';

// Business modules depend on this service, never on OneinchClient directly.
//
// Every method just logs context then rethrows the caught error as-is - OneinchClient
// already throws ProviderHttpError (the real 1inch HTTP status + body) for anything
// that fails, and GlobalExceptionFilter turns that into a proper API response (real
// status/code, not a blind 502) without this layer needing to re-wrap anything.
@Injectable()
export class OneinchService {
  private readonly logger = new Logger(OneinchService.name);

  constructor(private readonly client: OneinchClient) {}

  async getQuote(request: IOneinchQuoteRequest): Promise<IOneinchQuoteResponse> {
    try {
      return await this.client.getQuote(request);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch quote request failed');
      throw error;
    }
  }

  async getSwapTransaction(request: IOneinchSwapRequest): Promise<IOneinchSwapResponse> {
    try {
      return await this.client.getSwapTransaction(request);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch swap transaction request failed');
      throw error;
    }
  }

  async getAllowance(
    chainId: number,
    tokenAddress: string,
    walletAddress: string,
  ): Promise<IOneinchAllowanceResponse> {
    try {
      return await this.client.getAllowance(chainId, tokenAddress, walletAddress);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch allowance check failed');
      throw error;
    }
  }

  async getApprovalTransaction(
    chainId: number,
    tokenAddress: string,
    amount?: string,
  ): Promise<IOneinchApprovalTransactionResponse> {
    try {
      return await this.client.getApprovalTransaction(chainId, tokenAddress, amount);
    } catch (error) {
      this.logger.warn({ err: error }, '1inch approval transaction request failed');
      throw error;
    }
  }
}