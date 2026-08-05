import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SumsubModule } from '@integrations/sumsub/sumsub.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { SystemModule } from '@modules/system/system.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycVerificationRepository } from './repositories/kyc-verification.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycVerificationEntity]),
    SumsubModule,
    NotificationModule,
    SystemModule,
  ],
  controllers: [KycController],
  providers: [KycService, KycVerificationRepository],
  exports: [KycService],
})
export class KycModule {}
