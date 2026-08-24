import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import throttlerConfig from './throttler.config';
import turnkeyConfig from './turnkey.config';
import safeConfig from './safe.config';
import pimlicoConfig from './pimlico.config';
import oneinchConfig from './oneinch.config';
import lifiConfig from './lifi.config';
import swapFeeConfig from './swap.config';
import sumsubConfig from './sumsub.config';
import rainConfig from './rain.config';
import baanxConfig from './baanx.config';
import sendgridConfig from './sendgrid.config';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        throttlerConfig,
        turnkeyConfig,
        safeConfig,
        pimlicoConfig,
        oneinchConfig,
        lifiConfig,
        swapFeeConfig,
        sumsubConfig,
        rainConfig,
        baanxConfig,
        sendgridConfig,
      ],
    }),
  ],
})
export class ConfigModule {}