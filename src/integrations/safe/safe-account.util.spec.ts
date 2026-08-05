import { Address } from 'viem';
import {
  buildEnableModulesSetupCallData,
  buildExecuteUserOpCallData,
  buildGetNonceCallData,
} from './safe-account.util';

describe('safe-account.util', () => {
  const module4337: Address = '0x1111111111111111111111111111111111111111';
  const target: Address = '0x2222222222222222222222222222222222222222';

  describe('buildEnableModulesSetupCallData', () => {
    it('encodes a call to enableModules with the single module', () => {
      const calldata = buildEnableModulesSetupCallData(module4337);

      // enableModules(address[]) selector, verified against the compiled
      // ModuleManager ABI - see contracts.constant.ts sourcing notes.
      expect(calldata.startsWith('0x8d0dc49f')).toBe(true);
      expect(calldata).toContain(module4337.slice(2).toLowerCase());
    });
  });

  describe('buildExecuteUserOpCallData', () => {
    it('encodes a call to executeUserOp with the target, value, and data', () => {
      const calldata = buildExecuteUserOpCallData(target, 0n, '0xdeadbeef');

      expect(calldata.startsWith('0x')).toBe(true);
      expect(calldata).toContain(target.slice(2).toLowerCase());
      expect(calldata).toContain('deadbeef');
    });

    it('is deterministic for the same inputs', () => {
      expect(buildExecuteUserOpCallData(target, 0n, '0xdeadbeef')).toBe(
        buildExecuteUserOpCallData(target, 0n, '0xdeadbeef'),
      );
    });
  });

  describe('buildGetNonceCallData', () => {
    it('produces different calldata for different sender addresses', () => {
      expect(buildGetNonceCallData(target)).not.toBe(buildGetNonceCallData(module4337));
    });
  });
});
