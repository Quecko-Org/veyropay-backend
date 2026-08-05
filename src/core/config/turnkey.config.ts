import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface ITurnkeyConfig extends IProviderConfig {
  organizationId: string;
}

export default registerAs('turnkey', (): ITurnkeyConfig => ({
  baseUrl: process.env.TURNKEY_API_BASE_URL as string,
  apiKey: process.env.TURNKEY_API_PUBLIC_KEY as string,
  apiSecret: process.env.TURNKEY_API_PRIVATE_KEY,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID as string,
  timeoutMs: 10000,
  retryAttempts: 3,
}));
