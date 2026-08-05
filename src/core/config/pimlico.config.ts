import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface IPimlicoConfig extends IProviderConfig {
  // EOA private key funded on-chain that acts as the relayer for guardian-recovery
  // transactions (submits SocialRecoveryModule.multiConfirmRecovery on behalf of
  // guardians/users, who never pay gas themselves). Never exposed to the client -
  // see RelayerService and docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
  relayerPrivateKey: string;
  relayerChainId: number;
}

export default registerAs('pimlico', (): IPimlicoConfig => ({
  baseUrl: process.env.PIMLICO_API_BASE_URL as string,
  apiKey: process.env.PIMLICO_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY as string,
  relayerChainId: Number(process.env.RELAYER_CHAIN_ID ?? 8453),
}));
