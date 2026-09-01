import { Module, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { IAppConfig } from '@core/config/app.config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const app = configService.get<IAppConfig>('app') as IAppConfig;
        const isProduction = app.env === 'production';

        return {
          // Nest 11 / path-to-regexp v8 requires a named wildcard (default `/*` warns).
          forRoutes: [{ method: RequestMethod.ALL, path: '*splat' }],
          pinoHttp: {
            name: app.name,
            level: configService.get<string>('LOG_LEVEL') ?? 'info',
            genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                  },
                },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.privateKey',
                'req.body.seedPhrase',
                'req.body.secret',
                '*.password',
                '*.privateKey',
                '*.seedPhrase',
                '*.apiSecret',
              ],
              censor: '[REDACTED]',
            },
            customProps: () => ({ context: 'HTTP' }),
            autoLogging: true,
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
