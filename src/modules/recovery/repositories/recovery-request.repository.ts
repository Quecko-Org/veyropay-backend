import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
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
    });
  }

  findByIdWithRelations(id: string): Promise<RecoveryRequestEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        wallet: { user: true },
        approvals: { guardian: { guardianUser: true } },
      },
    });
  }
}
