import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SendgridModule } from '@integrations/sendgrid/sendgrid.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';
import { GuardianEntity } from './entities/guardian.entity';
import { GuardianRepository } from './repositories/guardian.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([GuardianEntity]),
    ProfileModule,
    WalletModule,
    NotificationModule,
    SendgridModule,
  ],
  controllers: [GuardianController],
  providers: [GuardianService, GuardianRepository],
  exports: [GuardianService],
})
export class GuardianModule {}
