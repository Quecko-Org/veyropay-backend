import { Module } from '@nestjs/common';
import { WalletModule } from '@modules/wallet/wallet.module';
import { TransactionModule } from '@modules/transaction/transaction.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { OneinchModule } from '@integrations/oneinch/oneinch.module';
import { LifiModule } from '@integrations/lifi/lifi.module';
import { PimlicoModule } from '@integrations/pimlico/pimlico.module';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';

@Module({
  imports: [
    WalletModule,
    TransactionModule,
    NotificationModule,
    OneinchModule,
    LifiModule,
    PimlicoModule,
  ],
  controllers: [SwapController],
  providers: [SwapService],
  exports: [SwapService],
})
export class SwapModule {}
