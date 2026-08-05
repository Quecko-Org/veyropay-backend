import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletModule } from '@modules/wallet/wallet.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { SystemModule } from '@modules/system/system.module';
import { SafeModule } from '@integrations/safe/safe.module';
import { PimlicoModule } from '@integrations/pimlico/pimlico.module';
import { SendgridModule } from '@integrations/sendgrid/sendgrid.module';
import { GuardianController } from './controllers/guardian.controller';
import { RecoveryRequestController } from './controllers/recovery-request.controller';
import { GuardianService } from './services/guardian.service';
import { RecoveryRequestService } from './services/recovery-request.service';
import { GuardianEntity } from './entities/guardian.entity';
import { RecoveryRequestEntity } from './entities/recovery-request.entity';
import { RecoveryApprovalEntity } from './entities/recovery-approval.entity';
import { GuardianRepository } from './repositories/guardian.repository';
import { RecoveryRequestRepository } from './repositories/recovery-request.repository';
import { RecoveryApprovalRepository } from './repositories/recovery-approval.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([GuardianEntity, RecoveryRequestEntity, RecoveryApprovalEntity]),
    WalletModule,
    ProfileModule,
    NotificationModule,
    SystemModule,
    SafeModule,
    PimlicoModule,
    SendgridModule,
  ],
  controllers: [GuardianController, RecoveryRequestController],
  providers: [
    GuardianService,
    RecoveryRequestService,
    GuardianRepository,
    RecoveryRequestRepository,
    RecoveryApprovalRepository,
  ],
  exports: [GuardianService, RecoveryRequestService],
})
export class GuardianRecoveryModule {}
