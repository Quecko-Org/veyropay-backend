import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { ICardProviderCard, ICardProviderClient, ICardProviderCustomer } from '@shared/interfaces';
import { BaanxClient } from './baanx.client';
import { BAANX_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on BaanxClient directly.
@Injectable()
export class BaanxService implements ICardProviderClient {
  private readonly logger = new Logger(BaanxService.name);

  constructor(private readonly client: BaanxClient) {}

  async createCustomer(externalUserId: string, email?: string): Promise<ICardProviderCustomer> {
    return this.guard(() => this.client.createCustomer(externalUserId, email), 'create customer');
  }

  async issueCard(customerId: string): Promise<ICardProviderCard> {
    return this.guard(() => this.client.issueCard(customerId), 'issue card');
  }

  async freezeCard(cardId: string): Promise<void> {
    return this.guard(() => this.client.freezeCard(cardId), 'freeze card');
  }

  async unfreezeCard(cardId: string): Promise<void> {
    return this.guard(() => this.client.unfreezeCard(cardId), 'unfreeze card');
  }

  async setSpendLimit(cardId: string, limit: string): Promise<void> {
    return this.guard(() => this.client.setSpendLimit(cardId, limit), 'set spend limit');
  }

  private async guard<T>(fn: () => Promise<T>, action: string): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn({ err: error }, `Baanx ${action} failed`);
      throw new ProviderException(
        BAANX_PROVIDER_NAME,
        `Baanx unavailable: ${action}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
