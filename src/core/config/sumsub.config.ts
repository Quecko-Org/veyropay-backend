import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export default registerAs('sumsub', (): IProviderConfig => ({
  baseUrl: process.env.SUMSUB_API_BASE_URL as string,
  apiKey: process.env.SUMSUB_APP_TOKEN as string,
  apiSecret: process.env.SUMSUB_SECRET_KEY,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
