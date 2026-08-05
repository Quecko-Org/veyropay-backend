import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { IProviderConfig } from '@shared/interfaces';
import { ISumsubAccessToken, ISumsubApplicant, ISumsubApplicantStatus } from './types';

// Thin HTTP client wrapper around the Sumsub API.
// See https://docs.sumsub.com/reference/authentication - every request is signed with an
// HMAC-SHA256 digest of (timestamp + method + path + body) using the app secret key.
@Injectable()
export class SumsubClient {
  private readonly config: IProviderConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<IProviderConfig>('sumsub') as IProviderConfig;
  }

  async createApplicant(externalUserId: string, levelName: string): Promise<ISumsubApplicant> {
    return this.request<ISumsubApplicant>(
      `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
      'POST',
      JSON.stringify({ externalUserId }),
    );
  }

  async getApplicantStatus(applicantId: string): Promise<ISumsubApplicantStatus> {
    return this.request<ISumsubApplicantStatus>(
      `/resources/applicants/${applicantId}/status`,
      'GET',
    );
  }

  async generateAccessToken(
    externalUserId: string,
    levelName: string,
  ): Promise<ISumsubAccessToken> {
    const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(levelName)}`;
    return this.request<ISumsubAccessToken>(path, 'POST');
  }

  private sign(timestamp: number, method: string, path: string, body: string): string {
    return createHmac('sha256', this.config.apiSecret as string)
      .update(timestamp + method.toUpperCase() + path + body)
      .digest('hex');
  }

  private async request<T>(path: string, method: string, body?: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        body,
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': this.config.apiKey,
          'X-App-Access-Sig': this.sign(timestamp, method, path, body ?? ''),
          'X-App-Access-Ts': String(timestamp),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Sumsub request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
