import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';
import { IBaanxCard, IBaanxCustomer } from './types';

// Thin HTTP client wrapper around the Baanx API (backup card provider).
// Endpoint shapes here follow common card-issuing REST conventions and should be
// verified against Baanx's current API reference before this goes live.
@Injectable()
export class BaanxClient {
  private readonly config: IProviderConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('baanx') as IProviderConfig;
  }

  async createCustomer(externalUserId: string, email?: string): Promise<IBaanxCustomer> {
    return this.request<IBaanxCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({ externalUserId, email }),
    });
  }

  async issueCard(customerId: string): Promise<IBaanxCard> {
    return this.request<IBaanxCard>('/cards', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  async freezeCard(cardId: string): Promise<void> {
    await this.request(`/cards/${cardId}/freeze`, { method: 'POST' });
  }

  async unfreezeCard(cardId: string): Promise<void> {
    await this.request(`/cards/${cardId}/unfreeze`, { method: 'POST' });
  }

  async setSpendLimit(cardId: string, limit: string): Promise<void> {
    await this.request(`/cards/${cardId}/limit`, {
      method: 'PATCH',
      body: JSON.stringify({ limit }),
    });
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Baanx request failed with status ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
