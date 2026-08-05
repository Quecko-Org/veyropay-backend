import { Address } from 'viem';
import {
  buildAddGuardianWithThresholdCallData,
  buildGetRecoveryHashCallData,
  buildMultiConfirmRecoveryCallData,
  buildRecoveryNonceCallData,
} from './social-recovery.util';

describe('social-recovery.util', () => {
  const guardian: Address = '0x1111111111111111111111111111111111111111';
  const wallet: Address = '0x2222222222222222222222222222222222222222';
  const newOwner: Address = '0x3333333333333333333333333333333333333333';

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
