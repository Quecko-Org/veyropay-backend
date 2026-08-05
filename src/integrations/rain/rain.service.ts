import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { ICardProviderCard, ICardProviderClient, ICardProviderCustomer } from '@shared/interfaces';
import { RainClient } from './rain.client';
import { RAIN_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on RainClient directly.
@Injectable()
export class RainService implements ICardProviderClient {
  private readonly logger = new Logger(RainService.name);

  constructor(private readonly client: RainClient) {}

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
      this.logger.warn({ err: error }, `Rain ${action} failed`);
      throw new ProviderException(
        RAIN_PROVIDER_NAME,
        `Rain unavailable: ${action}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
