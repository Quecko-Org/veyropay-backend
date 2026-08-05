import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { GuardianStatus } from '@shared/enums';
import { GuardianEntity } from '../entities/guardian.entity';

@Injectable()
export class GuardianRepository extends BaseRepository<GuardianEntity> {
  constructor(@InjectRepository(GuardianEntity) repository: Repository<GuardianEntity>) {
    super(repository);
  }

  findByWalletId(walletId: string): Promise<GuardianEntity[]> {
    return this.repository.find({ where: { walletId }, order: { createdAt: 'ASC' } });
  }

  findActiveByWalletId(walletId: string): Promise<GuardianEntity[]> {
    return this.repository.find({
      where: { walletId, status: GuardianStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  findByInvitationToken(invitationToken: string): Promise<GuardianEntity | null> {
    return this.repository.findOne({ where: { invitationToken } });
  }

  findActiveOrInvitedByEmail(
    walletId: string,
    guardianEmail: string,
  ): Promise<GuardianEntity | null> {
    return this.repository
      .createQueryBuilder('guardian')
      .where('guardian.walletId = :walletId', { walletId })
      .andWhere('guardian.guardianEmail = :guardianEmail', { guardianEmail })
      .andWhere('guardian.status IN (:...statuses)', {
        statuses: [GuardianStatus.INVITED, GuardianStatus.ACTIVE],
      })
      .getOne();
  }

  countActiveByWalletId(walletId: string): Promise<number> {
    return this.repository.count({ where: { walletId, status: GuardianStatus.ACTIVE } });
  }
}
