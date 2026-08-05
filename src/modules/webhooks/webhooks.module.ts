import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycModule } from '@modules/kyc/kyc.module';
import { CardModule } from '@modules/card/card.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEventEntity } from './entities/webhook-event.entity';
import { WebhookEventRepository } from './repositories/webhook-event.repository';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEventEntity]), KycModule, CardModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookEventRepository],
  exports: [WebhooksService],
})
export class WebhooksModule {}
