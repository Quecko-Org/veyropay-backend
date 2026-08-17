import { registerAs } from '@nestjs/config';
import { Hex } from 'viem';
import { IProviderConfig } from '@shared/interfaces';
import {
  SAFE_4337_MODULE_ADDRESS, 
  SAFE_MODULE_SETUP_ADDRESS,
} from '@integrations/safe/contracts.constant';
import { SOCIAL_RECOVERY_MODULE_ADDRESS } from '@integrations/safe/social-recovery-module.constant';

export interface ISafeConfig extends IProviderConfig {
  txServiceUrl: string;
  // JSON-RPC endpoint @safe-global/protocol-kit uses for address prediction, deployment
  // encoding, and on-chain reads (getModules, isModuleEnabled, etc). Reuses the existing
  // Pimlico endpoint - already this project's sole chain-RPC access point (see
  // PimlicoClient) - rather than adding a second RPC provider integration.
  rpcUrl: string;
  // Enabled at Safe.setup() time via PredictedSafeProps.safeAccountConfig - Protocol Kit
  // resolves the proxy factory / singleton addresses for the connected chain internally
  // (via its own @safe-global/safe-deployments dependency), it does not resolve *which*
  // module to enable, so that stays project-owned config. Override per-env only if the
  // Safe4337Module version changes - see contracts.constant.ts for provenance.
  moduleSetupAddress: Hex;
  module4337Address: Hex;
  // Defaults to the official SocialRecoveryModule address - NOT confirmed deployed on
  // Base as of this writing, see social-recovery-module.constant.ts.
  recoveryModuleAddress: Hex;
}

export default registerAs('safe', (): ISafeConfig => ({
  baseUrl: process.env.SAFE_API_BASE_URL as string,
  txServiceUrl: process.env.SAFE_TX_SERVICE_URL as string,
  apiKey: process.env.SAFE_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
  rpcUrl: (process.env.SAFE_RPC_URL as string), //|| (process.env.PIMLICO_API_BASE_URL as string),
  moduleSetupAddress: (process.env.SAFE_MODULE_SETUP_ADDRESS as Hex) ?? SAFE_MODULE_SETUP_ADDRESS,
  module4337Address: (process.env.SAFE_4337_MODULE_ADDRESS as Hex) ?? SAFE_4337_MODULE_ADDRESS,
  recoveryModuleAddress:
    (process.env.SAFE_RECOVERY_MODULE_ADDRESS as Hex) || SOCIAL_RECOVERY_MODULE_ADDRESS,
}));
