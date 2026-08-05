import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { DEFAULT_PAGE_SIZE } from '@common/constants';
import { RecoveryRequestStatus } from '@shared/enums';
import { RecoveryRequestEntity } from '../entities/recovery-request.entity';

@Injectable()
export class RecoveryRequestRepository extends BaseRepository<RecoveryRequestEntity> {
  constructor(
    @InjectRepository(RecoveryRequestEntity) repository: Repository<RecoveryRequestEntity>,
  ) {
    super(repository);
  }

  findPendingByWalletId(walletId: string): Promise<RecoveryRequestEntity | null> {
    return this.repository.findOne({
      where: { walletId, status: RecoveryRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  findHistoryForWallet(
    walletId: string,
    skip: number,
    take = DEFAULT_PAGE_SIZE,
  ): Promise<[RecoveryRequestEntity[], number]> {
    return this.repository.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
