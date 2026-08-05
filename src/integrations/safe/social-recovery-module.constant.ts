import { Hex } from 'viem';

// Safe's official SocialRecoveryModule (SRM) v0.1.0 - a real, audited, released Safe
// module implementing guardian-based social recovery via EIP-712 off-chain guardian
// signatures + relayer-submitted on-chain batch confirmation. Address and ABI sourced
// directly from the official @safe-global/safe-modules-deployments npm package
// (package/dist/assets/safe-recovery-module/v0.1.0/social-recovery-module.json),
// not hand transcribed.
//
// IMPORTANT - VERIFIED GAP: this module's `networkAddresses` deployment list covers
// chains [10, 1874, 2201, 4326, 42161, 42431, 46630, 5042002, 11155111, 11155420].
// Base (chainId 8453), this project's target chain, is NOT in that list as of this
// writing. The address below is used because it is deterministic (same CREATE2 address
// across every chain the module IS deployed on, a Safe-ecosystem convention) and is
// override-able via SAFE_RECOVERY_MODULE_ADDRESS, but it has NOT been confirmed to
// have deployed bytecode on Base. See docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1 for the
// full disclosure - this is the single biggest open item in the recovery-execution path.
export const SOCIAL_RECOVERY_MODULE_ADDRESS: Hex = '0x4Aa5Bf7D840aC607cb5BD3249e6Af6FC86C04897';

// Function subset actually used by this backend - full ABI has 24 functions, only the
// ones needed for guardian registration, hash computation, and relayed execution are
// included here.
export const SOCIAL_RECOVERY_MODULE_ABI = [
  {
    type: 'function',
    name: 'addGuardianWithThreshold',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_guardian', type: 'address' },
      { name: '_threshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeGuardianWithThreshold',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_prevGuardian', type: 'address' },
      { name: '_guardian', type: 'address' },
      { name: '_threshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'changeThreshold',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_threshold', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'multiConfirmRecovery',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_newOwners', type: 'address[]' },
      { name: '_newThreshold', type: 'uint256' },
      {
        name: '_signatures',
        type: 'tuple[]',
        components: [
          { name: 'signer', type: 'address' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: '_execute', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeRecovery',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_newOwners', type: 'address[]' },
      { name: '_newThreshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getRecoveryHash',
    stateMutability: 'view',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_newOwners', type: 'address[]' },
      { name: '_newThreshold', type: 'uint256' },
      { name: '_nonce', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'nonce',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isGuardian',
    stateMutability: 'view',
    inputs: [
      { name: '_wallet', type: 'address' },
      { name: '_guardian', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'guardiansCount',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'threshold',
    stateMutability: 'view',
    inputs: [{ name: '_wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
