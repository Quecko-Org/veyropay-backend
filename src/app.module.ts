import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@core/config';
import { DatabaseModule } from '@core/database';
import { LoggerModule } from '@core/logger';
import { HealthModule } from '@core/health';
import { MonitoringModule, MetricsInterceptor } from '@core/monitoring';
import { IThrottlerConfig } from '@core/config/throttler.config';
import { GlobalExceptionFilter } from '@common/filters';
import { ResponseInterceptor } from '@common/interceptors';
import { IntegrationsModule } from '@integrations/integrations.module';
import { ModulesModule } from '@modules/modules.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttler = configService.get<IThrottlerConfig>('throttler') as IThrottlerConfig;
        return [{ ttl: throttler.ttl * 1000, limit: throttler.limit }];
      },
    }),
    HealthModule,
    MonitoringModule,
    IntegrationsModule,
    ModulesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
