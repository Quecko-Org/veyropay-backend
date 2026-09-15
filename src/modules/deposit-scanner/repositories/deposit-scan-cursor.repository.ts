import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { DepositScanCursorEntity } from '../entities/deposit-scan-cursor.entity';

@Injectable()
export class DepositScanCursorRepository extends BaseRepository<DepositScanCursorEntity> {
  constructor(
    @InjectRepository(DepositScanCursorEntity) repository: Repository<DepositScanCursorEntity>,
  ) {
    super(repository);
  }

  findByChain(chain: string): Promise<DepositScanCursorEntity | null> {
    return this.repository.findOne({ where: { chain } });
  }
}