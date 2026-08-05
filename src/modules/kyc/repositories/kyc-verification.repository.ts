import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@database/base.repository';
import { KycVerificationEntity } from '../entities/kyc-verification.entity';

@Injectable()
export class KycVerificationRepository extends BaseRepository<KycVerificationEntity> {
  constructor(
    @InjectRepository(KycVerificationEntity) repository: Repository<KycVerificationEntity>,
  ) {
    super(repository);
  }

  findByUserId(userId: string): Promise<KycVerificationEntity | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findByApplicantId(applicantId: string): Promise<KycVerificationEntity | null> {
    return this.repository.findOne({ where: { applicantId } });
  }
}
