import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { AuditLogEntity } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLogEntity> {
  constructor(@InjectRepository(AuditLogEntity) repository: Repository<AuditLogEntity>) {
    super(repository);
  }

  findAndCountForUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[AuditLogEntity[], number]> {
    return this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
