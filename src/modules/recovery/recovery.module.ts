import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { SystemModule } from '@modules/system/system.module';
import { TurnkeyModule } from '@integrations/turnkey/turnkey.module';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';

@Module({
  imports: [AuthModule, NotificationModule, ProfileModule, SystemModule, TurnkeyModule],
  controllers: [RecoveryController],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
