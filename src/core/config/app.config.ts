import { registerAs } from '@nestjs/config';

export interface IAppConfig {
  env: string;
  port: number;
  name: string;
  apiPrefix: string;
  apiVersion: string;
  corsOrigin: string;
}

export default registerAs('app', (): IAppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  name: process.env.APP_NAME ?? 'nero-bank-backend',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? '1',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
}));
