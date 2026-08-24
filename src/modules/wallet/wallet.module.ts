import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionModule } from '@modules/transaction/transaction.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { TurnkeyModule } from '@integrations/turnkey/turnkey.module';
import { SafeModule } from '@integrations/safe/safe.module';
import { PimlicoModule } from '@integrations/pimlico/pimlico.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletEntity } from './entities/wallet.entity';
import { GasSponsorshipEntity } from './entities/gas-sponsorship.entity';
import { WalletRepository } from './repositories/wallet.repository';
import { GasSponsorshipRepository } from './repositories/gas-sponsorship.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, GasSponsorshipEntity]),
    TransactionModule,
    ProfileModule,
    TurnkeyModule,
    SafeModule,
    PimlicoModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, GasSponsorshipRepository],
  exports: [WalletService],
})
export class WalletModule {}