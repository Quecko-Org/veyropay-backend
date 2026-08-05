import { Module } from '@nestjs/common';
import { WalletModule } from '@modules/wallet/wallet.module';
import { TransactionModule } from '@modules/transaction/transaction.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PimlicoModule } from '@integrations/pimlico/pimlico.module';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [WalletModule, TransactionModule, NotificationModule, PimlicoModule],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
