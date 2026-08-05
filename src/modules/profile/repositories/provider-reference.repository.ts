import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { ProviderReferenceEntity } from '../entities/provider-reference.entity';

@Injectable()
export class ProviderReferenceRepository extends BaseRepository<ProviderReferenceEntity> {
  constructor(
    @InjectRepository(ProviderReferenceEntity) repository: Repository<ProviderReferenceEntity>,
  ) {
    super(repository);
  }

  findByUserAndProvider(userId: string, provider: string): Promise<ProviderReferenceEntity | null> {
    return this.repository.findOne({ where: { userId, provider } });
  }

  findAllForUser(userId: string): Promise<ProviderReferenceEntity[]> {
    return this.repository.find({ where: { userId } });
  }
}
