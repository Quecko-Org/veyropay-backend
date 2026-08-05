import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@database/base.entity';
import { WebhookProvider, WebhookStatus } from '@shared/enums';

@Entity('webhook_events')
export class WebhookEventEntity extends BaseEntity {
  @Index()
  @Column({ type: 'enum', enum: WebhookProvider })
  provider!: WebhookProvider;

  @Column({ name: 'event_type' })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.RECEIVED })
  status!: WebhookStatus;
}
