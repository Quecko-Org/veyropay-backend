import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { KycStatus, WebhookProvider, WebhookStatus } from '@shared/enums';
import { IRainConfig } from '@core/config/rain.config';
import { IBaanxConfig } from '@core/config/baanx.config';
import { IProviderConfig } from '@shared/interfaces';
import { KycService } from '@modules/kyc/kyc.service';
import { CardService } from '@modules/card/card.service';
import { WebhookEventRepository } from './repositories/webhook-event.repository';

interface ISumsubWebhookPayload {
  applicantId: string;
  type: string;
  reviewResult?: { reviewAnswer: 'GREEN' | 'RED' };
}

interface ICardWebhookPayload {
  cardId: string;
  type: string;
  merchant: string;
  amount: string;
  currency: string;
  settlementCurrency: string;
  id: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookEventRepository: WebhookEventRepository,
    private readonly kycService: KycService,
    private readonly cardService: CardService,
  ) {}

  async handleSumsub(rawBody: Buffer, signature: string | undefined): Promise<void> {
    this.verifySignature(WebhookProvider.SUMSUB, rawBody, signature);
    const payload = JSON.parse(rawBody.toString('utf8')) as ISumsubWebhookPayload;

    await this.record(
      WebhookProvider.SUMSUB,
      payload.type,
      payload as unknown as Record<string, unknown>,
    );

    const status = this.mapSumsubReviewAnswer(payload.reviewResult?.reviewAnswer);
    if (status) {
      await this.kycService.handleStatusUpdate(payload.applicantId, status);
    }
  }

  async handleRain(rawBody: Buffer, signature: string | undefined): Promise<void> {
    this.verifySignature(WebhookProvider.RAIN, rawBody, signature);
    const payload = JSON.parse(rawBody.toString('utf8')) as ICardWebhookPayload;

    await this.record(
      WebhookProvider.RAIN,
      payload.type,
      payload as unknown as Record<string, unknown>,
    );
    await this.cardService.recordProviderTransaction(payload.cardId, {
      merchant: payload.merchant,
      amount: payload.amount,
      currency: payload.currency,
      settlementCurrency: payload.settlementCurrency,
      providerReference: payload.id,
    });
  }

  async handleBaanx(rawBody: Buffer, signature: string | undefined): Promise<void> {
    this.verifySignature(WebhookProvider.BAANX, rawBody, signature);
    const payload = JSON.parse(rawBody.toString('utf8')) as ICardWebhookPayload;

    await this.record(
      WebhookProvider.BAANX,
      payload.type,
      payload as unknown as Record<string, unknown>,
    );
    await this.cardService.recordProviderTransaction(payload.cardId, {
      merchant: payload.merchant,
      amount: payload.amount,
      currency: payload.currency,
      settlementCurrency: payload.settlementCurrency,
      providerReference: payload.id,
    });
  }

  private mapSumsubReviewAnswer(answer: 'GREEN' | 'RED' | undefined): KycStatus | null {
    if (answer === 'GREEN') return KycStatus.APPROVED;
    if (answer === 'RED') return KycStatus.REJECTED;
    return null;
  }

  private async record(
    provider: WebhookProvider,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event = this.webhookEventRepository.create({
      provider,
      eventType: eventType ?? 'unknown',
      payload,
      status: WebhookStatus.PROCESSED,
    });

    await this.webhookEventRepository.save(event);
  }

  private verifySignature(
    provider: WebhookProvider,
    rawBody: Buffer,
    signature: string | undefined,
  ): void {
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const secret = this.getSecret(provider);
    const expectedBuffer = Buffer.from(
      createHmac('sha256', secret).update(rawBody).digest('hex'),
      'hex',
    );

    let providedBuffer: Buffer;
    try {
      providedBuffer = Buffer.from(signature, 'hex');
    } catch {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const isValid =
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isValid) {
      this.logger.warn({ provider }, 'Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private getSecret(provider: WebhookProvider): string {
    switch (provider) {
      case WebhookProvider.SUMSUB:
        return (this.configService.get<IProviderConfig>('sumsub') as IProviderConfig)
          .apiSecret as string;
      case WebhookProvider.RAIN:
        return (this.configService.get<IRainConfig>('rain') as IRainConfig).webhookSecret;
      case WebhookProvider.BAANX:
        return (this.configService.get<IBaanxConfig>('baanx') as IBaanxConfig).webhookSecret;
    }
  }
}
