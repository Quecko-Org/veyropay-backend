import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { WalletModule } from '@modules/wallet/wallet.module';
import { TransactionModule } from '@modules/transaction/transaction.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { DepositScannerService } from './deposit-scanner.service';
import { DepositScanCursorEntity } from './entities/deposit-scan-cursor.entity';
import { DepositScanCursorRepository } from './repositories/deposit-scan-cursor.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositScanCursorEntity]),
    WalletModule,
    TransactionModule,
    NotificationModule,
  ],
  providers: [DepositScannerService, DepositScanCursorRepository, ChainRpcClient],
})
export class DepositScannerModule {}
