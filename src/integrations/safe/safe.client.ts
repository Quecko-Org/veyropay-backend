import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISafeConfig } from '@core/config/safe.config';
import { ISafeCreationInfo, ISafeInfo, ISafesByOwnerResponse } from './types';

// Thin HTTP client wrapper around the Safe Transaction Service API (read-only).
// See https://docs.safe.global/core-api/transaction-service-reference
//
// Provider integration only - no account creation, owner/guardian management, or
// transaction confirmation here. Those are business logic and stay out of this
// layer per docs/17_DEVELOPMENT_ROADMAP.md / docs/18_DECISIONS_AND_ASSUMPTIONS.md
// until the guardian-recovery phase.
@Injectable()
export class SafeClient {
  private readonly config: ISafeConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<ISafeConfig>('safe') as ISafeConfig;
  }

  async getSafeInfo(safeAddress: string): Promise<ISafeInfo> {
    return this.request<ISafeInfo>(`/api/v1/safes/${safeAddress}/`);
  }

  async getSafeCreationInfo(safeAddress: string): Promise<ISafeCreationInfo> {
    return this.request<ISafeCreationInfo>(`/api/v1/safes/${safeAddress}/creation/`);
  }

  async getSafesByOwner(ownerAddress: string): Promise<ISafesByOwnerResponse> {
    return this.request<ISafesByOwnerResponse>(`/api/v1/owners/${ownerAddress}/safes/`);
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.txServiceUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Safe request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
