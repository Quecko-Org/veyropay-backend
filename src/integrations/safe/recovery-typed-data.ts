import { Address, Hex } from 'viem';

export const SOCIAL_RECOVERY_EIP712_NAME = 'Social Recovery Module';
export const SOCIAL_RECOVERY_EIP712_VERSION = '0.0.1';

export const EXECUTE_RECOVERY_TYPES = {
  ExecuteRecovery: [
    { name: 'wallet', type: 'address' },
    { name: 'newOwners', type: 'address[]' },
    { name: 'newThreshold', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export interface IRecoveryTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: typeof EXECUTE_RECOVERY_TYPES;
  primaryType: 'ExecuteRecovery';
  message: {
    wallet: Address;
    newOwners: Address[];
    newThreshold: string;
    nonce: string;
  };
}

// EIP-712 payload guardians must sign (Turnkey / wallet). Domain must match the
// SocialRecoveryModule's getRecoveryHash digest on the target chain.
export function buildRecoveryTypedData(params: {
  chainId: number;
  verifyingContract: Address;
  wallet: Address;
  newOwners: Address[];
  newThreshold: bigint;
  nonce: bigint;
}): IRecoveryTypedData {
  return {
    domain: {
      name: SOCIAL_RECOVERY_EIP712_NAME,
      version: SOCIAL_RECOVERY_EIP712_VERSION,
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
    },
    types: EXECUTE_RECOVERY_TYPES,
    primaryType: 'ExecuteRecovery',
    message: {
      wallet: params.wallet,
      newOwners: params.newOwners,
      newThreshold: params.newThreshold.toString(),
      nonce: params.nonce.toString(),
    },
  };
}

export type { Hex };
