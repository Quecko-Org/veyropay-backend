import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { TransactionEntity } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository extends BaseRepository<TransactionEntity> {
  constructor(@InjectRepository(TransactionEntity) repository: Repository<TransactionEntity>) {
    super(repository);
  }

  findAndCountForWallet(
    walletId: string,
    skip: number,
    take: number,
  ): Promise<[TransactionEntity[], number]> {
    return this.repository.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
