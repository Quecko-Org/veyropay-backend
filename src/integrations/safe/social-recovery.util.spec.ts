import { Address } from 'viem';
import {
  buildAddGuardianWithThresholdCallData,
  buildGetRecoveryHashCallData,
  buildMultiConfirmRecoveryCallData,
  buildRecoveryNonceCallData,
  resolveAddGuardianThreshold,
} from './social-recovery.util';

describe('social-recovery.util', () => {
  const guardian: Address = '0x1111111111111111111111111111111111111111';
  const wallet: Address = '0x2222222222222222222222222222222222222222';
  const newOwner: Address = '0x3333333333333333333333333333333333333333';

  describe('resolveAddGuardianThreshold', () => {
    it('clamps to 1 when no guardians are on-chain yet', () => {
      expect(resolveAddGuardianThreshold(2, 0)).toBe(1);
    });

    it('allows raising threshold as on-chain count grows', () => {
      expect(resolveAddGuardianThreshold(2, 1)).toBe(2);
      expect(resolveAddGuardianThreshold(3, 1)).toBe(2);
      expect(resolveAddGuardianThreshold(3, 2)).toBe(3);
    });
  });

  describe('buildAddGuardianWithThresholdCallData', () => {
    it('encodes a call to addGuardianWithThreshold', () => {
      const calldata = buildAddGuardianWithThresholdCallData(guardian, 2n);

      // addGuardianWithThreshold(address,uint256) selector, verified against the
      // official SocialRecoveryModule ABI - see social-recovery-module.constant.ts.
      expect(calldata.startsWith('0xbe0e54d7')).toBe(true);
      expect(calldata).toContain(guardian.slice(2).toLowerCase());
    });
  });

  describe('buildMultiConfirmRecoveryCallData', () => {
    it('encodes a batch confirmation with the collected guardian signatures', () => {
      const calldata = buildMultiConfirmRecoveryCallData(
        wallet,
        [newOwner],
        1n,
        [{ signer: guardian, signature: '0xdeadbeef' }],
        true,
      );

      expect(calldata.startsWith('0x')).toBe(true);
      expect(calldata).toContain(wallet.slice(2).toLowerCase());
      expect(calldata).toContain(newOwner.slice(2).toLowerCase());
      expect(calldata).toContain(guardian.slice(2).toLowerCase());
    });

    it('is deterministic for the same inputs', () => {
      const build = () =>
        buildMultiConfirmRecoveryCallData(
          wallet,
          [newOwner],
          1n,
          [{ signer: guardian, signature: '0xdeadbeef' }],
          true,
        );

      expect(build()).toBe(build());
    });
  });

  describe('buildGetRecoveryHashCallData / buildRecoveryNonceCallData', () => {
    it('produce distinct calldata per function', () => {
      const hashCalldata = buildGetRecoveryHashCallData(wallet, [newOwner], 1n, 0n);
      const nonceCalldata = buildRecoveryNonceCallData(wallet);

      expect(hashCalldata).not.toBe(nonceCalldata);
    });
  });
});
