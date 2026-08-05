import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CardProvider, CardStatus, NotificationType } from '@shared/enums';
import { ICardProviderClient } from '@shared/interfaces';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { ProfileService } from '@modules/profile/profile.service';
import { KycService } from '@modules/kyc/kyc.service';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { RainService } from '@integrations/rain/rain.service';
import { BaanxService } from '@integrations/baanx/baanx.service';
import { CardRepository } from './repositories/card.repository';
import { CardTransactionRepository } from './repositories/card-transaction.repository';
import { CardEntity } from './entities/card.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { SetSpendLimitDto } from './dto/set-spend-limit.dto';
import { IRecordCardTransaction } from './interfaces';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  // Rain is preferred; Baanx is only used if Rain is unavailable, per
  // docs/08_PROVIDER_INTEGRATIONS.md.
  private readonly providers: { name: CardProvider; client: ICardProviderClient }[];

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly cardTransactionRepository: CardTransactionRepository,
    private readonly profileService: ProfileService,
    private readonly kycService: KycService,
    private readonly notificationService: NotificationService,
    private readonly systemService: SystemService,
    private readonly rainService: RainService,
    private readonly baanxService: BaanxService,
  ) {
    this.providers = [
      { name: CardProvider.RAIN, client: this.rainService },
      { name: CardProvider.BAANX, client: this.baanxService },
    ];
  }

  async issueCard(userId: string): Promise<CardEntity> {
    const existing = await this.cardRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const kycApproved = await this.kycService.isApproved(userId);
    if (!kycApproved) {
      throw new ForbiddenException('KYC verification must be approved before ordering a card');
    }

    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        const customerId = await this.getOrCreateProviderCustomer(
          userId,
          provider.name,
          provider.client,
        );
        const issued = await provider.client.issueCard(customerId);

        const card = this.cardRepository.create({
          userId,
          provider: provider.name,
          cardReference: issued.id,
          status: CardStatus.ACTIVE,
        });

        const saved = await this.cardRepository.save(card);

        await this.notificationService.notify(
          userId,
          NotificationType.CARD,
          'Card issued',
          `Your virtual card is ready (${provider.name}).`,
        );

        return saved;
      } catch (error) {
        this.logger.warn(
          { err: error, provider: provider.name },
          'Card issuance failed, trying next provider',
        );
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Card issuance failed: no provider available');
  }

  async getByUserId(userId: string): Promise<CardEntity> {
    const card = await this.cardRepository.findByUserId(userId);
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async freeze(userId: string): Promise<CardEntity> {
    const card = await this.getByUserId(userId);
    await this.providerFor(card).freezeCard(card.cardReference);
    card.status = CardStatus.FROZEN;
    const saved = await this.cardRepository.save(card);

    await this.notificationService.notify(
      userId,
      NotificationType.CARD,
      'Card frozen',
      'Your card has been frozen.',
    );
    await this.systemService.recordAudit('card_frozen', userId, { cardId: card.id });

    return saved;
  }

  async unfreeze(userId: string): Promise<CardEntity> {
    const card = await this.getByUserId(userId);
    await this.providerFor(card).unfreezeCard(card.cardReference);
    card.status = CardStatus.ACTIVE;
    const saved = await this.cardRepository.save(card);

    await this.notificationService.notify(
      userId,
      NotificationType.CARD,
      'Card unfrozen',
      'Your card has been unfrozen.',
    );

    return saved;
  }

  async setSpendLimit(userId: string, dto: SetSpendLimitDto): Promise<CardEntity> {
    const card = await this.getByUserId(userId);
    await this.providerFor(card).setSpendLimit(card.cardReference, dto.limit);
    card.spendLimit = dto.limit;
    return this.cardRepository.save(card);
  }

  async listTransactions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<CardTransactionEntity>> {
    const card = await this.getByUserId(userId);
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.cardTransactionRepository.findAndCountForCard(
      card.id,
      skip,
      take,
    );

    return new PaginatedResultDto(
      items,
      total,
      query.page ?? DEFAULT_PAGE,
      query.limit ?? DEFAULT_PAGE_SIZE,
    );
  }

  // Invoked by the Rain/Baanx webhook handler when a card authorization/settlement comes in.
  // Idempotent on providerReference so retried webhook deliveries don't double-record.
  async recordProviderTransaction(
    cardReference: string,
    data: IRecordCardTransaction,
  ): Promise<void> {
    const card = await this.cardRepository.findByCardReference(cardReference);
    if (!card) {
      this.logger.warn({ cardReference }, 'Received card transaction webhook for unknown card');
      return;
    }

    if (data.providerReference) {
      const existing = await this.cardTransactionRepository.findByProviderReference(
        data.providerReference,
      );
      if (existing) {
        return;
      }
    }

    const transaction = this.cardTransactionRepository.create({
      cardId: card.id,
      merchant: data.merchant,
      amount: data.amount,
      currency: data.currency,
      settlementCurrency: data.settlementCurrency,
      providerReference: data.providerReference,
    });

    await this.cardTransactionRepository.save(transaction);

    await this.notificationService.notify(
      card.userId,
      NotificationType.CARD,
      'Card payment',
      `${data.merchant}: ${data.amount} ${data.currency}`,
    );
  }

  private providerFor(card: CardEntity): ICardProviderClient {
    const provider = this.providers.find((p) => p.name === card.provider);
    if (!provider) {
      throw new NotFoundException(`Unknown card provider: ${card.provider}`);
    }

    return provider.client;
  }

  private async getOrCreateProviderCustomer(
    userId: string,
    provider: CardProvider,
    client: ICardProviderClient,
  ): Promise<string> {
    const existing = await this.profileService.getProviderReference(userId, provider);
    if (existing) {
      return existing;
    }

    const customer = await client.createCustomer(userId);
    await this.profileService.setProviderReference(userId, provider, customer.id);
    return customer.id;
  }
}
