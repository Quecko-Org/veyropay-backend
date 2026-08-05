import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { WalletModule } from './wallet/wallet.module';
import { TransferModule } from './transfer/transfer.module';
import { SwapModule } from './swap/swap.module';
import { RecoveryModule } from './recovery/recovery.module';
import { GuardianRecoveryModule } from './guardian-recovery/guardian-recovery.module';
import { CardModule } from './card/card.module';
import { KycModule } from './kyc/kyc.module';
import { TransactionModule } from './transaction/transaction.module';
import { NotificationModule } from './notification/notification.module';
import { SystemModule } from './system/system.module';
import { WebhooksModule } from './webhooks/webhooks.module';

// Aggregates every business module so app.module.ts only imports this one module.
@Module({
  imports: [
    AuthModule,
    ProfileModule,
    WalletModule,
    TransferModule,
    SwapModule,
    RecoveryModule,
    GuardianRecoveryModule,
    CardModule,
    KycModule,
    TransactionModule,
    NotificationModule,
    SystemModule,
    WebhooksModule,
  ],
})
export class ModulesModule {}
