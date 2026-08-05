import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { WebhookEventEntity } from '../entities/webhook-event.entity';

@Injectable()
export class WebhookEventRepository extends BaseRepository<WebhookEventEntity> {
  constructor(@InjectRepository(WebhookEventEntity) repository: Repository<WebhookEventEntity>) {
    super(repository);
  }
}
