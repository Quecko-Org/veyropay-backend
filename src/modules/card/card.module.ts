import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from '@modules/profile/profile.module';
import { KycModule } from '@modules/kyc/kyc.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { SystemModule } from '@modules/system/system.module';
import { RainModule } from '@integrations/rain/rain.module';
import { BaanxModule } from '@integrations/baanx/baanx.module';
import { CardController } from './card.controller';
import { CardService } from './card.service';
import { CardEntity } from './entities/card.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { CardRepository } from './repositories/card.repository';
import { CardTransactionRepository } from './repositories/card-transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardEntity, CardTransactionEntity]),
    ProfileModule,
    KycModule,
    NotificationModule,
    SystemModule,
    RainModule,
    BaanxModule,
  ],
  controllers: [CardController],
  providers: [CardService, CardRepository, CardTransactionRepository],
  exports: [CardService],
})
export class CardModule {}
