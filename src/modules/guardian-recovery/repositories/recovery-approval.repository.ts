import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { RecoveryApprovalStatus } from '@shared/enums';
import { RecoveryApprovalEntity } from '../entities/recovery-approval.entity';

@Injectable()
export class RecoveryApprovalRepository extends BaseRepository<RecoveryApprovalEntity> {
  constructor(
    @InjectRepository(RecoveryApprovalEntity) repository: Repository<RecoveryApprovalEntity>,
  ) {
    super(repository);
  }

  findByRecoveryRequestId(recoveryRequestId: string): Promise<RecoveryApprovalEntity[]> {
    return this.repository.find({ where: { recoveryRequestId }, relations: ['guardian'] });
  }

  findByRequestAndGuardian(
    recoveryRequestId: string,
    guardianId: string,
  ): Promise<RecoveryApprovalEntity | null> {
    return this.repository.findOne({ where: { recoveryRequestId, guardianId } });
  }

  countApprovedForRequest(recoveryRequestId: string): Promise<number> {
    return this.repository.count({
      where: { recoveryRequestId, status: RecoveryApprovalStatus.APPROVED },
    });
  }

  findApprovedForRequest(recoveryRequestId: string): Promise<RecoveryApprovalEntity[]> {
    return this.repository.find({
      where: { recoveryRequestId, status: RecoveryApprovalStatus.APPROVED },
      relations: ['guardian'],
      order: { decidedAt: 'ASC' },
    });
  }
}
