import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { GuardianStatus } from '@shared/enums';
import { GuardianEntity } from '../entities/guardian.entity';

const OPEN_STATUSES = [GuardianStatus.INVITED, GuardianStatus.ACTIVE];

const LIST_STATUSES = [GuardianStatus.INVITED, GuardianStatus.ACTIVE, GuardianStatus.REJECTED];

function statusSortRank(status: GuardianStatus): number {
  if (status === GuardianStatus.INVITED) {
    return 0;
  }
  if (status === GuardianStatus.ACTIVE) {
    return 1;
  }
  if (status === GuardianStatus.REJECTED) {
    return 2;
  }
  return 3;
}

function sortByStatusThenCreatedAt(rows: GuardianEntity[]): GuardianEntity[] {
  return rows.sort((a, b) => {
    const byStatus = statusSortRank(a.status) - statusSortRank(b.status);
    if (byStatus !== 0) {
      return byStatus;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

@Injectable()
export class GuardianRepository extends BaseRepository<GuardianEntity> {
  constructor(@InjectRepository(GuardianEntity) repository: Repository<GuardianEntity>) {
    super(repository);
  }

  countOpenForWallet(walletId: string): Promise<number> {
    return this.repository.count({
      where: { walletId, status: In(OPEN_STATUSES) },
    });
  }

  findOpenByWalletAndEmail(walletId: string, email: string): Promise<GuardianEntity | null> {
    return this.repository.findOne({
      where: { walletId, guardianEmail: email, status: In(OPEN_STATUSES) },
    });
  }

  findOpenByWalletAndUserId(walletId: string, userId: string): Promise<GuardianEntity | null> {
    return this.repository.findOne({
      where: { walletId, guardianUserId: userId, status: In(OPEN_STATUSES) },
    });
  }

  async findOutgoingForWallet(walletId: string): Promise<GuardianEntity[]> {
    const rows = await this.repository.find({
      where: { walletId, status: In(LIST_STATUSES) },
      relations: { guardianUser: true, wallet: { user: true } },
    });
    return sortByStatusThenCreatedAt(rows);
  }

  async findIncomingForUser(userId: string, email?: string): Promise<GuardianEntity[]> {
    const rows = await this.repository
      .createQueryBuilder('guardian')
      .leftJoinAndSelect('guardian.guardianUser', 'guardianUser')
      .leftJoinAndSelect('guardian.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'owner')
      .where('guardian.status IN (:...statuses)', { statuses: LIST_STATUSES })
      .andWhere('(guardian.guardianUserId = :userId OR LOWER(guardian.guardianEmail) = :email)', {
        userId,
        email: (email ?? '').toLowerCase(),
      })
      .getMany();

    return sortByStatusThenCreatedAt(rows);
  }

  findByIdWithRelations(id: string): Promise<GuardianEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { guardianUser: true, wallet: { user: true } },
    });
  }

  findActiveApproversForWallet(walletId: string): Promise<GuardianEntity[]> {
    return this.repository.find({
      where: {
        walletId,
        status: GuardianStatus.ACTIVE,
        canApproveRecovery: true,
      },
      relations: { guardianUser: true },
      order: { createdAt: 'ASC' },
    });
  }
}
