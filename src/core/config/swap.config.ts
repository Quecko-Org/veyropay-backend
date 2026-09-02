import { registerAs } from '@nestjs/config';

export interface ISwapFeeConfig {
  percentage: number; // human-readable, e.g. 0.5 for 0.5%
  recipientAddress: string; // 1inch referrer address
  lifiIntegratorId: string;
}

export default registerAs('swapFee', (): ISwapFeeConfig => ({
  percentage: parseFloat(process.env.SWAP_FEE_PERCENTAGE ?? '0'),
  recipientAddress: process.env.SWAP_FEE_RECIPIENT_ADDRESS ?? '',
  lifiIntegratorId: process.env.LIFI_INTEGRATOR_ID ?? 'veyropayy',
}));
