import { Address, encodeFunctionData, Hex } from 'viem';
import {
  ENTRY_POINT_GET_NONCE_ABI,
  SAFE_4337_EXECUTE_USER_OP_ABI,
  SAFE_MODULE_SETUP_ABI,
  SAFE_OPERATION_CALL,
} from './contracts.constant';

// What remains here after the Protocol Kit migration (see safe.service.ts) is only what
// Protocol Kit does not provide: this project's own choice of which module to enable at
// setup time, and this project's existing ERC-4337 UserOperation wrapping (Protocol Kit
// has no 4337 awareness - that lives in the separate @safe-global/relay-kit package,
// which this project does not adopt, per the decision to keep the existing
// Pimlico-based UserOperation flow unchanged).

// Delegatecall calldata passed as the `to`/`data` pair of Protocol Kit's
// PredictedSafeProps.safeAccountConfig - executed once, during Safe.setup(), to enable
// the Safe4337Module as the Safe's sole module.
export function buildEnableModulesSetupCallData(module4337Address: Address): Hex {
  return encodeFunctionData({
    abi: SAFE_MODULE_SETUP_ABI,
    functionName: 'enableModules',
    args: [[module4337Address]],
  });
}

// Calldata for the UserOperation's `callData` field - routes execution through
// the Safe4337Module (installed as the Safe's fallback handler) to perform a
// single CALL from the Safe to `to`.
export function buildExecuteUserOpCallData(to: Address, value: bigint, data: Hex): Hex {
  return encodeFunctionData({
    abi: SAFE_4337_EXECUTE_USER_OP_ABI,
    functionName: 'executeUserOp',
    args: [to, value, data, SAFE_OPERATION_CALL],
  });
}

export function buildGetNonceCallData(safeAddress: Address, key = 0n): Hex {
  return encodeFunctionData({
    abi: ENTRY_POINT_GET_NONCE_ABI,
    functionName: 'getNonce',
    args: [safeAddress, key],
  });
}
