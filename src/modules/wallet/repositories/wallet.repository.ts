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

  findBySmartAccountAddress(address: string): Promise<WalletEntity | null> {
    return this.repository
      .createQueryBuilder('wallet')
      .where('LOWER(wallet.smart_account_address) = LOWER(:address)', {
        address: address.trim(),
      })
      .getOne();
  }
}
