import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { CardEntity } from '../entities/card.entity';

@Injectable()
export class CardRepository extends BaseRepository<CardEntity> {
  constructor(@InjectRepository(CardEntity) repository: Repository<CardEntity>) {
    super(repository);
  }

  findByUserId(userId: string): Promise<CardEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findByCardReference(cardReference: string): Promise<CardEntity | null> {
    return this.repository.findOne({ where: { cardReference } });
  }
}
