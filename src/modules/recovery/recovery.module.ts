import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardianEntity } from '@modules/guardian/entities/guardian.entity';
import { GuardianRepository } from '@modules/guardian/repositories/guardian.repository';
import { NotificationModule } from '@modules/notification/notification.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { RecoveryApprovalEntity } from './entities/recovery-approval.entity';
import { RecoveryRequestEntity } from './entities/recovery-request.entity';
import { RecoveryApprovalRepository } from './repositories/recovery-approval.repository';
import { RecoveryRequestRepository } from './repositories/recovery-request.repository';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecoveryRequestEntity, RecoveryApprovalEntity, GuardianEntity]),
    ProfileModule,
    WalletModule,
    NotificationModule,
  ],
  controllers: [RecoveryController],
  providers: [
    RecoveryService,
    RecoveryRequestRepository,
    RecoveryApprovalRepository,
    GuardianRepository,
  ],
  exports: [RecoveryService],
})
export class RecoveryModule {}
