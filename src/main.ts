import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { IAppConfig } from '@core/config/app.config';

async function bootstrap(): Promise<void> {
  // rawBody is required to verify provider webhook signatures (Sumsub, Rain, Baanx).
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<IAppConfig>('app') as IAppConfig;

  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });

  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Nero Bank Backend API')
      .setDescription('Orchestration API for the Nero Bank non-custodial crypto neo-bank')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(`${appConfig.apiPrefix}/docs`, app, swaggerDocument);

  await app.listen(appConfig.port);
}

void bootstrap();
