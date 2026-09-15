import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { RecoveryRequestStatus } from '@shared/enums';
import { RecoveryRequestEntity } from '../entities/recovery-request.entity';

const ACTIVE_RECOVERY_STATUSES = [
  RecoveryRequestStatus.PENDING,
  RecoveryRequestStatus.APPROVED,
] as const;

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

  // Pending or approved-but-not-executed — only one of these may exist per wallet.
  findActiveByWalletId(walletId: string): Promise<RecoveryRequestEntity | null> {
    return this.repository.findOne({
      where: { walletId, status: In([...ACTIVE_RECOVERY_STATUSES]) },
      order: { createdAt: 'DESC' },
    });
  }

  findActiveOthersByWalletId(
    walletId: string,
    exceptId: string,
  ): Promise<RecoveryRequestEntity[]> {
    return this.repository.find({
      where: { walletId, status: In([...ACTIVE_RECOVERY_STATUSES]) },
    }).then((rows) => rows.filter((row) => row.id !== exceptId));
  }

  findByWalletIdWithRelations(
    walletId: string,
    status?: RecoveryRequestStatus,
  ): Promise<RecoveryRequestEntity[]> {
    return this.repository.find({
      where: status ? { walletId, status } : { walletId },
      relations: {
        wallet: { user: true },
        approvals: { guardian: { guardianUser: true } },
      },
      order: { createdAt: 'DESC' },
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
