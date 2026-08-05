import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export default registerAs('oneinch', (): IProviderConfig => ({
  baseUrl: process.env.ONEINCH_API_BASE_URL as string,
  apiKey: process.env.ONEINCH_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
