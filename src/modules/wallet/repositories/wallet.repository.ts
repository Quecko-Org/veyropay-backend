import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { WalletEntity } from '../entities/wallet.entity';

@Injectable()
export class WalletRepository extends BaseRepository<WalletEntity> {
  constructor(@InjectRepository(WalletEntity) repository: Repository<WalletEntity>) {
    super(repository);
  }

  findByUserId(userId: string): Promise<WalletEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }
}
