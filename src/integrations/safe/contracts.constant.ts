import { Hex } from 'viem';

// Safe4337Module v0.3.0 deployment metadata for Base (chainId 8453). Sourced from the
// official @safe-global/safe-modules-deployments npm package. Proxy factory / singleton
// / setup addresses used to live here too, but are now resolved internally by
// @safe-global/protocol-kit (via its own @safe-global/safe-deployments dependency) -
// see safe.service.ts. What remains here is only what Protocol Kit does NOT know about:
// this project's specific choice to enable the Safe4337Module at setup time (an
// architecture decision, not something a generic SDK should default for you), and the
// ERC-4337 execution/nonce primitives Protocol Kit doesn't cover (that's
// @safe-global/relay-kit's domain, out of scope per the decision to keep this project's
// existing Pimlico-based UserOperation flow rather than adopting a second SDK for it).
export const SAFE_MODULE_SETUP_ADDRESS: Hex = '0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47';
export const SAFE_4337_MODULE_ADDRESS: Hex = '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226';

// Delegatecall helper invoked once, during Safe.setup(), to enable the Safe4337Module -
// this is the `to`/`data` pair passed into Protocol Kit's PredictedSafeProps.
// safeAccountConfig. Protocol Kit builds/encodes the surrounding setup() and
// createProxyWithNonce() calls; it does not decide *which* module to enable at setup
// time, so this one piece of manual ABI encoding remains necessary.
export const SAFE_MODULE_SETUP_ABI = [
  {
    type: 'function',
    name: 'enableModules',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'modules', type: 'address[]' }],
    outputs: [],
  },
] as const;

// Entry point through which the EntryPoint (via the 4337 module as fallback
// handler) executes the account's intended call during UserOperation execution.
// Protocol Kit has no ERC-4337 awareness (that's @safe-global/relay-kit), so this
// project's existing UserOperation callData wrapping stays hand-encoded.
export const SAFE_4337_EXECUTE_USER_OP_ABI = [
  {
    type: 'function',
    name: 'executeUserOp',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
    ],
    outputs: [],
  },
] as const;

export const ENTRY_POINT_GET_NONCE_ABI = [
  {
    type: 'function',
    name: 'getNonce',
    stateMutability: 'view',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'key', type: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256' }],
  },
] as const;

// Operation type for Safe's execTransaction/executeUserOp - 0 = CALL, 1 = DELEGATECALL.
export const SAFE_OPERATION_CALL = 0;
export const SAFE_OPERATION_DELEGATECALL = 1;
