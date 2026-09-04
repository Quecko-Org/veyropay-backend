import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { RecoveryApprovalStatus, RecoveryRequestStatus } from '@shared/enums';
import { RecoveryApprovalEntity } from '../entities/recovery-approval.entity';

@Injectable()
export class RecoveryApprovalRepository extends BaseRepository<RecoveryApprovalEntity> {
  constructor(
    @InjectRepository(RecoveryApprovalEntity) repository: Repository<RecoveryApprovalEntity>,
  ) {
    super(repository);
  }

  findByIdWithRelations(id: string): Promise<RecoveryApprovalEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        guardian: { guardianUser: true },
        recoveryRequest: {
          wallet: { user: true },
          approvals: true,
        },
      },
    });
  }

  async findIncomingForGuardian(userId: string, email?: string): Promise<RecoveryApprovalEntity[]> {
    return this.repository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.guardian', 'guardian')
      .leftJoinAndSelect('guardian.guardianUser', 'guardianUser')
      .leftJoinAndSelect('approval.recoveryRequest', 'request')
      .leftJoinAndSelect('request.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'owner')
      .leftJoinAndSelect('request.approvals', 'allApprovals')
      .where('request.status IN (:...requestStatuses)', {
        requestStatuses: [RecoveryRequestStatus.PENDING, RecoveryRequestStatus.APPROVED],
      })
      .andWhere('(guardian.guardianUserId = :userId OR LOWER(guardian.guardianEmail) = :email)', {
        userId,
        email: (email ?? '').toLowerCase(),
      })
      .orderBy('approval.createdAt', 'DESC')
      .getMany();
  }

  countByStatuses(recoveryRequestId: string, statuses: RecoveryApprovalStatus[]): Promise<number> {
    return this.repository.count({
      where: { recoveryRequestId, status: In(statuses) },
    });
  }
}
