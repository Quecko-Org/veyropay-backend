export interface IProviderConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  timeoutMs: number;
  retryAttempts: number;
}
