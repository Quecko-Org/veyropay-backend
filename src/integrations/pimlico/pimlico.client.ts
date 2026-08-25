import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import {
  IJsonRpcResponse,
  IPimlicoGasPriceResponse,
  IPimlicoSponsorUserOperationResult,
  IUserOperation,
  IUserOperationReceipt,
} from './types';

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



  async getGasPrice(): Promise<IPimlicoGasPriceResponse> {
    return this.rpcCall<IPimlicoGasPriceResponse>('pimlico_getUserOperationGasPrice', []);
  }

  async sponsorUserOperation(
    userOperation: IUserOperation,
    entryPoint: string,
    sponsorshipPolicyId?: string,
  ): Promise<IPimlicoSponsorUserOperationResult> {
    return this.rpcCall<IPimlicoSponsorUserOperationResult>('pm_sponsorUserOperation', [
      userOperation,
      entryPoint,
      sponsorshipPolicyId ? { sponsorshipPolicyId } : null,
    ]);
  }

 

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    console.log("rpcCall gas",method,params)
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
    console.log("request",path,init,`${this.config.baseUrl}${path}`)
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