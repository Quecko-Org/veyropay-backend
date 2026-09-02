import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { GasSponsorshipEntity } from '../entities/gas-sponsorship.entity';

@Injectable()
export class GasSponsorshipRepository extends BaseRepository<GasSponsorshipEntity> {
  constructor(
    @InjectRepository(GasSponsorshipEntity) repository: Repository<GasSponsorshipEntity>,
  ) {
    super(repository);
  }

  // Sum of sponsored wei for this user since a given timestamp - used to check the
  // daily/monthly cap. Returns 0n, not null, when there's no usage yet.
  async sumSince(userId: string, since: Date): Promise<bigint> {
    const result = await this.repository
      .createQueryBuilder('sponsorship')
      .select('COALESCE(SUM(sponsorship.amountWei), 0)', 'total')
      .where('sponsorship.userId = :userId', { userId })
      .andWhere('sponsorship.createdAt >= :since', { since })
      .getRawOne<{ total: string }>();

    return BigInt(result?.total ?? 0);
  }
}
