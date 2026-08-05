import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface IBaanxConfig extends IProviderConfig {
  webhookSecret: string;
}

export default registerAs('baanx', (): IBaanxConfig => ({
  baseUrl: process.env.BAANX_API_BASE_URL as string,
  apiKey: process.env.BAANX_API_KEY as string,
  webhookSecret: process.env.BAANX_WEBHOOK_SECRET as string,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
