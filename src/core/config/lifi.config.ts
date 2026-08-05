import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export default registerAs('lifi', (): IProviderConfig => ({
  baseUrl: process.env.LIFI_API_BASE_URL as string,
  apiKey: process.env.LIFI_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
