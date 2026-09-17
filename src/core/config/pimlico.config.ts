import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface IPimlicoConfig extends IProviderConfig {
  // EOA private key funded on-chain that acts as the relayer for guardian-recovery
  // transactions (submits SocialRecoveryModule.multiConfirmRecovery on behalf of
  // guardians/users, who never pay gas themselves). Never exposed to the client -
  // see RelayerService and docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
  relayerPrivateKey: string;
  relayerChainId: number;
  sponsorshipPolicyId?: string;
  userDailyGasCapWei?: string;
  userMonthlyGasCapWei?: string;
}

function normalizeRelayerPrivateKey(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) {
    return value;
  }
  return value.startsWith('0x') || value.startsWith('0X') ? value : `0x${value}`;
}

export default registerAs('pimlico', (): IPimlicoConfig => ({
  baseUrl: process.env.PIMLICO_API_BASE_URL as string,
  apiKey: process.env.PIMLICO_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
  relayerPrivateKey: normalizeRelayerPrivateKey(process.env.RELAYER_PRIVATE_KEY),
  relayerChainId: Number(process.env.RELAYER_CHAIN_ID ?? 8453),
  sponsorshipPolicyId: process.env.PIMLICO_SPONSORSHIP_POLICY_ID || undefined,
  userDailyGasCapWei: process.env.GAS_SPONSORSHIP_USER_DAILY_CAP_WEI || undefined,
  userMonthlyGasCapWei: process.env.GAS_SPONSORSHIP_USER_MONTHLY_CAP_WEI || undefined,
}));
