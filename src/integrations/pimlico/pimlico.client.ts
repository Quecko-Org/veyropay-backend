import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { ProviderHttpError } from '@common/utils';
import {
  IJsonRpcResponse,
  IPimlicoGasPriceResponse,
  IPimlicoSponsorUserOperationResult,
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

  // The RPC result's `transactionHash` is nested under `receipt`, not top-level -
  // unwrap it here so the rest of the codebase can keep using the flat
  // IUserOperationReceipt shape.
  async getUserOperationReceipt(userOpHash: string): Promise<IUserOperationReceipt | null> {
    const raw = await this.rpcCall<{
      userOpHash: string;
      receipt: { transactionHash: string };
      success: boolean;
      reason?: string;
    } | null>('eth_getUserOperationReceipt', [userOpHash]);

    if (!raw) return null;
    return {
      userOpHash: raw.userOpHash,
      transactionHash: raw.receipt.transactionHash,
      success: raw.success,
      reason: raw.reason,
    };
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

  // Sponsors a UserOperation's gas via Pimlico's verifying paymaster. Per-user/
  // per-transaction/global spend caps are enforced by Pimlico itself via the
  // configured Sponsorship Policy (see docs.pimlico.io/guides/how-to/sponsorship-policies)
  // - not re-implemented here. Pimlico simply declines this call once a cap is hit.
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
    const response = await this.request<IJsonRpcResponse<T>>('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: this.nextRequestId++, method, params }),
    });

    if (response.error) {
      // Pimlico's bundler reports logical failures (AA21/AA24/maxFeePerGas-too-low/...)
      // as a 200 OK with this error object, never as an HTTP 4xx/5xx - so the JSON-RPC
      // error code is the only real "provider status" available here.
      throw new ProviderHttpError(
        `Pimlico RPC error (${response.error.code}): ${response.error.message}`,
        response.error.code,
      );
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
        const errorBody = await response.text();
        throw new ProviderHttpError(
          `Pimlico request failed with status ${response.status}: ${errorBody}`,
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