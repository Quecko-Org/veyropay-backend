import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface IRainConfig extends IProviderConfig {
  webhookSecret: string;
}

export default registerAs('rain', (): IRainConfig => ({
  baseUrl: process.env.RAIN_API_BASE_URL as string,
  apiKey: process.env.RAIN_API_KEY as string,
  webhookSecret: process.env.RAIN_WEBHOOK_SECRET as string,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
