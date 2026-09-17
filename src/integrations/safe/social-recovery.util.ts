import { Address, encodeFunctionData, Hex } from 'viem';
import { SOCIAL_RECOVERY_MODULE_ABI } from './social-recovery-module.constant';

export interface IGuardianSignature {
  signer: Address;
  signature: Hex;
}

// Pure, dependency-free calldata builders for Safe's official SocialRecoveryModule -
// mirrors the ABI-encoding style of safe-account.util.ts. See
// social-recovery-module.constant.ts for ABI/address sourcing notes.

// Called BY the Safe itself (via executeUserOp, owner-signed) - registers a guardian
// on-chain and sets the wallet's recovery threshold in the same call, per the module's
// own design (every add/revoke call re-states the threshold).
export function buildAddGuardianWithThresholdCallData(
  guardianAddress: Address,
  threshold: bigint,
): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'addGuardianWithThreshold',
    args: [guardianAddress, threshold],
  });
}

export function buildChangeThresholdCallData(threshold: bigint): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'changeThreshold',
    args: [threshold],
  });
}

// Callable by ANYONE holding valid guardian signatures - this is the relayer entry
// point. Submits every collected off-chain EIP-712 guardian signature in one batch and,
// when `execute` is true and the module's own threshold/timelock conditions are already
// satisfied, performs the owner swap in the same transaction.
export function buildMultiConfirmRecoveryCallData(
  wallet: Address,
  newOwners: Address[],
  newThreshold: bigint,
  signatures: IGuardianSignature[],
  execute: boolean,
): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'multiConfirmRecovery',
    args: [wallet, newOwners, newThreshold, signatures, execute],
  });
}

// Public / relayer-callable after the module grace period (executeAfter). This is what
// actually swaps Safe owners - multiConfirmRecovery only starts the delay.
export function buildFinalizeRecoveryCallData(wallet: Address): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'finalizeRecovery',
    args: [wallet],
  });
}

export function buildGetRecoveryRequestCallData(wallet: Address): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'getRecoveryRequest',
    args: [wallet],
  });
}

export function buildGetRecoveryHashCallData(
  wallet: Address,
  newOwners: Address[],
  newThreshold: bigint,
  nonce: bigint,
): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'getRecoveryHash',
    args: [wallet, newOwners, newThreshold, nonce],
  });
}

export function buildRecoveryNonceCallData(wallet: Address): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'nonce',
    args: [wallet],
  });
}

export function buildIsGuardianCallData(wallet: Address, guardian: Address): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'isGuardian',
    args: [wallet, guardian],
  });
}

export function buildGuardiansCountCallData(wallet: Address): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_MODULE_ABI,
    functionName: 'guardiansCount',
    args: [wallet],
  });
}

// SocialRecoveryModule requires threshold <= guardianCount *after* the add. Encoding the
// final DB/target threshold while on-chain count is still lower reverts with
// "GS: threshold must be lower or equal to guardians count" (wrapped as ExecutionFailed
// by Safe4337Module). Clamp to the post-add count so each sequential registration is valid.
export function resolveAddGuardianThreshold(
  desiredThreshold: number,
  onChainGuardiansCount: number,
): number {
  const afterAdd = Math.max(0, onChainGuardiansCount) + 1;
  const desired = Math.max(1, desiredThreshold);
  return Math.min(desired, afterAdd);
}
