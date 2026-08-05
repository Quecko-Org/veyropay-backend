import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IJwtConfig } from '@core/config/jwt.config';
import { TurnkeyModule } from '@integrations/turnkey/turnkey.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { SystemModule } from '@modules/system/system.module';
import { JwtStrategy } from './services/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceSessionEntity } from './entities/device-session.entity';
import { DeviceSessionRepository } from './repositories/device-session.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwt = configService.get<IJwtConfig>('jwt') as IJwtConfig;

        return {
          secret: jwt.accessSecret,
          signOptions: {
            expiresIn: jwt.accessExpiresIn as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
    TypeOrmModule.forFeature([DeviceSessionEntity]),
    TurnkeyModule,
    ProfileModule,
    WalletModule,
    NotificationModule,
    SystemModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, DeviceSessionRepository],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
