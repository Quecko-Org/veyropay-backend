import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { CardTransactionEntity } from '../entities/card-transaction.entity';

@Injectable()
export class CardTransactionRepository extends BaseRepository<CardTransactionEntity> {
  constructor(
    @InjectRepository(CardTransactionEntity) repository: Repository<CardTransactionEntity>,
  ) {
    super(repository);
  }

  findAndCountForCard(
    cardId: string,
    skip: number,
    take: number,
  ): Promise<[CardTransactionEntity[], number]> {
    return this.repository.findAndCount({
      where: { cardId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findByProviderReference(providerReference: string): Promise<CardTransactionEntity | null> {
    return this.repository.findOne({ where: { providerReference } });
  }
}
