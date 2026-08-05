import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import {
  IJsonRpcResponse,
  IPimlicoGasPriceResponse,
  IUserOperation,
  IUserOperationReceipt,
} from './types';

// Thin JSON-RPC client wrapper around the Pimlico bundler/paymaster API.
// See https://docs.pimlico.io - exact method availability depends on the chain/EntryPoint.
@Injectable()
export class PimlicoClient {
  private readonly config: IProviderConfig;
  private nextRequestId = 1;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('pimlico') as IProviderConfig;
  }

  async sendUserOperation(userOperation: IUserOperation, entryPoint: string): Promise<string> {
    return this.rpcCall<string>('eth_sendUserOperation', [userOperation, entryPoint]);
  }

  async getUserOperationReceipt(userOpHash: string): Promise<IUserOperationReceipt | null> {
    return this.rpcCall<IUserOperationReceipt | null>('eth_getUserOperationReceipt', [userOpHash]);
  }

  async estimateUserOperationGas(
    userOperation: IUserOperation,
    entryPoint: string,
  ): Promise<Record<string, string>> {
    return this.rpcCall('eth_estimateUserOperationGas', [userOperation, entryPoint]);
  }

  // Pimlico endpoints proxy standard Ethereum JSON-RPC methods alongside the
  // bundler-specific ones, so these reuse the same client rather than requiring a
  // separate RPC provider integration.
  async ethCall(to: string, data: string): Promise<string> {
    return this.rpcCall<string>('eth_call', [{ to, data }, 'latest']);
  }

  async getCode(address: string): Promise<string> {
    return this.rpcCall<string>('eth_getCode', [address, 'latest']);
  }

  async getGasPrice(): Promise<IPimlicoGasPriceResponse> {
    return this.rpcCall<IPimlicoGasPriceResponse>('pimlico_getUserOperationGasPrice', []);
  }

  // Standard JSON-RPC methods used by RelayerService to broadcast a plain (non-4337)
  // transaction - Pimlico's endpoint proxies these alongside its bundler-specific ones,
  // same rationale as ethCall/getCode above.
  async getTransactionCount(address: string): Promise<string> {
    return this.rpcCall<string>('eth_getTransactionCount', [address, 'pending']);
  }

  async sendRawTransaction(signedTransaction: string): Promise<string> {
    return this.rpcCall<string>('eth_sendRawTransaction', [signedTransaction]);
  }

  async chainId(): Promise<string> {
    return this.rpcCall<string>('eth_chainId', []);
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const response = await this.request<IJsonRpcResponse<T>>('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: this.nextRequestId++, method, params }),
    });

    if (response.error) {
      throw new Error(`Pimlico RPC error (${response.error.code}): ${response.error.message}`);
    }

    return response.result as T;
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Pimlico request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
