import { registerAs } from '@nestjs/config';

export interface IThrottlerConfig {
  ttl: number;
  limit: number;
}

export default registerAs('throttler', (): IThrottlerConfig => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));
