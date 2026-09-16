import { Injectable, Logger } from '@nestjs/common';
import { SumsubClient } from './sumsub.client';
import { ISumsubAccessToken, ISumsubApplicant, ISumsubApplicantStatus } from './types';
import { SUMSUB_LEVEL_NAME } from './constants';

// Business modules depend on this service, never on SumsubClient directly.
//
// Every method just logs context then rethrows the caught error as-is - SumsubClient
// already throws ProviderHttpError (the real Sumsub HTTP status + body) for anything
// that fails, and GlobalExceptionFilter turns that into a proper API response (real
// status/code, not a blind 502) without this layer needing to re-wrap anything.
@Injectable()
export class SumsubService {
  private readonly logger = new Logger(SumsubService.name);

  constructor(private readonly client: SumsubClient) {}

  async createApplicant(externalUserId: string): Promise<ISumsubApplicant> {
    try {
      return await this.client.createApplicant(externalUserId, SUMSUB_LEVEL_NAME);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub applicant creation failed');
      throw error;
    }
  }

  async generateAccessToken(externalUserId: string): Promise<ISumsubAccessToken> {
    try {
      return await this.client.generateAccessToken(externalUserId, SUMSUB_LEVEL_NAME);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub access token generation failed');
      throw error;
    }
  }

  async getApplicantStatus(applicantId: string): Promise<ISumsubApplicantStatus> {
    try {
      return await this.client.getApplicantStatus(applicantId);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub status lookup failed');
      throw error;
    }
  }
}