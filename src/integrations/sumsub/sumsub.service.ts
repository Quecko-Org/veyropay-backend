import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { SumsubClient } from './sumsub.client';
import { ISumsubAccessToken, ISumsubApplicant, ISumsubApplicantStatus } from './types';
import { SUMSUB_LEVEL_NAME, SUMSUB_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on SumsubClient directly.
@Injectable()
export class SumsubService {
  private readonly logger = new Logger(SumsubService.name);

  constructor(private readonly client: SumsubClient) {}

  async createApplicant(externalUserId: string): Promise<ISumsubApplicant> {
    try {
      return await this.client.createApplicant(externalUserId, SUMSUB_LEVEL_NAME);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub applicant creation failed');
      throw new ProviderException(SUMSUB_PROVIDER_NAME, 'Unable to start identity verification');
    }
  }

  async generateAccessToken(externalUserId: string): Promise<ISumsubAccessToken> {
    try {
      return await this.client.generateAccessToken(externalUserId, SUMSUB_LEVEL_NAME);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub access token generation failed');
      throw new ProviderException(
        SUMSUB_PROVIDER_NAME,
        'Unable to start identity verification session',
      );
    }
  }

  async getApplicantStatus(applicantId: string): Promise<ISumsubApplicantStatus> {
    try {
      return await this.client.getApplicantStatus(applicantId);
    } catch (error) {
      this.logger.warn({ err: error }, 'Sumsub status lookup failed');
      throw new ProviderException(
        SUMSUB_PROVIDER_NAME,
        'Unable to fetch verification status',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
