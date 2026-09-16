import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Safe from '@safe-global/protocol-kit';
import { Address, decodeFunctionResult, getAddress, Hex } from 'viem';
import { ProviderException } from '@common/exceptions';
import { ISafeConfig } from '@core/config/safe.config';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { SafeClient } from './safe.client';
import { ISafeCreationInfo, ISafeInfo } from './types';
import { SAFE_PROVIDER_NAME } from './constants';
import { buildEnableModuleCallData, buildEnableModulesSetupCallData } from './safe-account.util';
import { SOCIAL_RECOVERY_MODULE_ABI } from './social-recovery-module.constant';
import {
  buildAddGuardianWithThresholdCallData,
  buildChangeThresholdCallData,
  buildFinalizeRecoveryCallData,
  buildGetRecoveryHashCallData,
  buildGetRecoveryRequestCallData,
  buildGuardiansCountCallData,
  buildIsGuardianCallData,
  buildMultiConfirmRecoveryCallData,
  buildRecoveryNonceCallData,
  IGuardianSignature,
} from './social-recovery.util';

export interface ISafeCallData {
  to: Address;
  value: bigint;
  data: Hex;
}

// Business modules depend on this service, never on SafeClient directly, and never on
// @safe-global/protocol-kit directly.
//
// Protocol Kit owns every Safe-native primitive it provides (counterfactual address
// prediction, deployment encoding, owner swap, module enable/query) - manual ABI
// encoding for those was removed in favor of it. What it does NOT provide stays here:
// (a) this project's own choice to enable the Safe4337Module at setup time (an
// architecture decision, not a generic SDK default), (b) this project's existing
// ERC-4337 UserOperation wrapping (Protocol Kit has no 4337 awareness - that's the
// separate @safe-global/relay-kit package, not adopted here so the existing
// Pimlico-based UserOperation flow stays unchanged), and (c) the SocialRecoveryModule's
// own custom functions (addGuardianWithThreshold, multiConfirmRecovery, getRecoveryHash,
// nonce) - a third-party module Protocol Kit has no built-in knowledge of, so those stay
// hand-encoded via social-recovery.util.ts, verified against the module's real ABI.
//
// The backend never holds Safe owner key material - Turnkey signs client-side. Protocol
// Kit here is used exclusively in its no-signer, encoding/prediction/read mode (no
// `signer` is ever passed to Safe.init); every Safe-level operation this service returns
// is unsigned {to, value, data}, fed into the existing UserOperation-preparation flow for
// the client to sign via Turnkey - identical non-custodial model as before this
// migration, see docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.
@Injectable()
export class SafeService {
  private readonly logger = new Logger(SafeService.name);
  private readonly config: ISafeConfig;

  constructor(
    private readonly client: SafeClient,
    private readonly chainRpcClient: ChainRpcClient,
    configService: ConfigService,
  ) {
    this.config = configService.get<ISafeConfig>('safe') as ISafeConfig;
  }

  // Protocol Kit instance for a Safe that may not be deployed yet - address prediction /
  // deployment-transaction encoding only work in this mode.
  private async getPredictedKit(ownerAddress: Address): Promise<Safe> {
    return Safe.init({
      provider: this.config.rpcUrl,
      predictedSafe: {
        safeAccountConfig: {
          owners: [ownerAddress],
          threshold: 1,
          to: this.config.moduleSetupAddress,
          data: buildEnableModulesSetupCallData(this.config.module4337Address),
          fallbackHandler: this.config.module4337Address,
        },
      },
    });
  }

  // Protocol Kit instance for an already-deployed Safe - required for anything that
  // reads on-chain state (getModules, isModuleEnabled, createSwapOwnerTx, etc).
  private async getDeployedKit(safeAddress: Address): Promise<Safe> {
    return Safe.init({ provider: this.config.rpcUrl, safeAddress });
  }

  // Deterministic counterfactual address for a single-owner Safe with the
  // Safe4337Module enabled - stable and computable before any on-chain deployment.
  async predictAddress(ownerAddress: Address): Promise<Address> {
    try {
      const kit = await this.getPredictedKit(ownerAddress);
      return (await kit.getAddress()) as Address;
    } catch (error) {
      this.logger.warn({ err: error }, 'Safe address prediction failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to predict Safe address');
    }
  }

  // Unsigned {to, value, data} for SafeProxyFactory.createProxyWithNonce(), for use as
  // the tail of a UserOperation's initCode on the Safe's first-ever transaction.
  // Returns null when the Safe is already on-chain (getCode can lag Protocol Kit).
  async buildDeploymentTransaction(ownerAddress: Address): Promise<ISafeCallData | null> {
    try {
      const kit = await this.getPredictedKit(ownerAddress);
      const tx = await kit.createSafeDeploymentTransaction();
      return { to: tx.to as Address, value: BigInt(tx.value), data: tx.data as Hex };
    } catch (error) {
      if (error instanceof Error && /already deployed/i.test(error.message)) {
        this.logger.log(
          { ownerAddress },
          'Safe already deployed - skipping deployment transaction encoding',
        );
        return null;
      }
      this.logger.warn({ err: error }, 'Safe deployment transaction encoding failed');
      throw new ProviderException(
        SAFE_PROVIDER_NAME,
        'Unable to build Safe deployment transaction',
      );
    }
  }

  getRecoveryModuleAddress(): Address {
    return this.config.recoveryModuleAddress;
  }

  async isSafeDeployed(safeAddress: Address): Promise<boolean> {
    try {
      const code = await this.chainRpcClient.getCode(safeAddress);
      return Boolean(code) && code !== '0x';
    } catch (error) {
      this.logger.warn({ err: error, safeAddress }, 'Safe deployment check failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to check Safe deployment state');
    }
  }

  // Unsigned {to, value, data} for Safe.enableModule() - additive opt-in step, executed
  // as a normal UserOperation through the Safe's own executeUserOp (same path as any
  // other Safe transaction). Works for counterfactual (not-yet-deployed) Safes too:
  // prepare UserOp attaches factory/factoryData automatically when code is empty.
  async buildEnableRecoveryModuleTransaction(safeAddress: Address): Promise<ISafeCallData> {
    const deployed = await this.isSafeDeployed(safeAddress);
    if (deployed) {
      try {
        const kit = await this.getDeployedKit(safeAddress);
        const tx = await kit.createEnableModuleTx(this.config.recoveryModuleAddress);
        return {
          to: tx.data.to as Address,
          value: BigInt(tx.data.value),
          data: tx.data.data as Hex,
        };
      } catch (error) {
        this.logger.warn({ err: error }, 'Enable-module transaction encoding failed');
        throw new ProviderException(
          SAFE_PROVIDER_NAME,
          'Unable to build enable-module transaction',
        );
      }
    }

    return {
      to: getAddress(safeAddress),
      value: 0n,
      data: buildEnableModuleCallData(this.config.recoveryModuleAddress),
    };
  }

  async isRecoveryModuleEnabled(safeAddress: Address): Promise<boolean> {
    try {
      const kit = await this.getDeployedKit(safeAddress);
      return await kit.isModuleEnabled(this.config.recoveryModuleAddress);
    } catch (error) {
      this.logger.warn({ err: error }, 'Recovery module enablement lookup failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to check recovery module state');
    }
  }

  // Unsigned {to, value, data} replacing the Safe's current (single) owner with a new
  // one via Protocol Kit's own owner-swap encoding (handles the linked-list prevOwner
  // internally). Kept for reference / a possible future non-guardian ownership-transfer
  // flow - actual guardian recovery execution goes through the SocialRecoveryModule's
  // multiConfirmRecovery() instead (see buildMultiConfirmRecoveryCallData below), since
  // the module owns the owner-swap internally once guardian signatures are verified.
  async buildOwnerSwapTransaction(
    safeAddress: Address,
    oldOwnerAddress: Address,
    newOwnerAddress: Address,
  ): Promise<ISafeCallData> {
    try {
      const kit = await this.getDeployedKit(safeAddress);
      const tx = await kit.createSwapOwnerTx({ oldOwnerAddress, newOwnerAddress });
      return { to: tx.data.to as Address, value: BigInt(tx.data.value), data: tx.data.data as Hex };
    } catch (error) {
      this.logger.warn({ err: error }, 'Owner-swap transaction encoding failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to build owner-swap transaction');
    }
  }

  // --- SocialRecoveryModule - third-party module, no Protocol Kit support (see class
  // doc comment). Pure ABI encoding, unchanged by the Protocol Kit migration. ---

  // Called BY the Safe (owner-signed UserOperation) to register a guardian's on-chain
  // address and the wallet's recovery threshold with the SocialRecoveryModule.
  buildAddGuardianCallData(guardianAddress: Address, threshold: number): Hex {
    return buildAddGuardianWithThresholdCallData(guardianAddress, BigInt(threshold));
  }

  buildChangeRecoveryThresholdCallData(threshold: number): Hex {
    return buildChangeThresholdCallData(BigInt(threshold));
  }

  // Backend-as-relayer entry point - submits every off-chain-collected guardian
  // signature in one batch. See RecoveryRequestService.executeRecovery().
  buildMultiConfirmRecoveryCallData(
    walletAddress: Address,
    newOwnerAddress: Address,
    signatures: IGuardianSignature[],
  ): Hex {
    return buildMultiConfirmRecoveryCallData(
      walletAddress,
      [newOwnerAddress],
      1n,
      signatures,
      true,
    );
  }

  buildFinalizeRecoveryCallData(walletAddress: Address): Hex {
    return buildFinalizeRecoveryCallData(walletAddress);
  }

  buildGetRecoveryRequestCallData(walletAddress: Address): Hex {
    return buildGetRecoveryRequestCallData(walletAddress);
  }

  buildGetRecoveryHashCallData(
    walletAddress: Address,
    newOwnerAddress: Address,
    nonce: bigint,
  ): Hex {
    return buildGetRecoveryHashCallData(walletAddress, [newOwnerAddress], 1n, nonce);
  }

  buildRecoveryNonceCallData(walletAddress: Address): Hex {
    return buildRecoveryNonceCallData(walletAddress);
  }

  buildIsGuardianCallData(walletAddress: Address, guardianAddress: Address): Hex {
    return buildIsGuardianCallData(walletAddress, guardianAddress);
  }

  buildGuardiansCountCallData(walletAddress: Address): Hex {
    return buildGuardiansCountCallData(walletAddress);
  }

  async getGuardiansCount(safeAddress: Address): Promise<number> {
    try {
      const result = await this.chainRpcClient.ethCall(
        this.config.recoveryModuleAddress,
        buildGuardiansCountCallData(safeAddress),
      );
      const count = decodeFunctionResult({
        abi: SOCIAL_RECOVERY_MODULE_ABI,
        functionName: 'guardiansCount',
        data: result as Hex,
      });
      return Number(count);
    } catch (error) {
      this.logger.warn({ err: error }, 'Recovery module guardiansCount lookup failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to read on-chain guardian count');
    }
  }

  async isRecoveryGuardian(safeAddress: Address, guardianAddress: Address): Promise<boolean> {
    try {
      const result = await this.chainRpcClient.ethCall(
        this.config.recoveryModuleAddress,
        buildIsGuardianCallData(safeAddress, guardianAddress),
      );
      return decodeFunctionResult({
        abi: SOCIAL_RECOVERY_MODULE_ABI,
        functionName: 'isGuardian',
        data: result as Hex,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Recovery module isGuardian lookup failed');
      throw new ProviderException(SAFE_PROVIDER_NAME, 'Unable to check on-chain guardian status');
    }
  }

  async getSafeInfo(safeAddress: string): Promise<ISafeInfo> {
    try {
      return await this.client.getSafeInfo(safeAddress);
    } catch (error) {
      this.logger.warn({ err: error }, 'Safe info lookup failed');
      throw new ProviderException(
        SAFE_PROVIDER_NAME,
        'Unable to fetch Safe info',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getSafeCreationInfo(safeAddress: string): Promise<ISafeCreationInfo> {
    try {
      return await this.client.getSafeCreationInfo(safeAddress);
    } catch (error) {
      this.logger.warn({ err: error }, 'Safe creation info lookup failed');
      throw new ProviderException(
        SAFE_PROVIDER_NAME,
        'Unable to fetch Safe creation info',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getSafesByOwner(ownerAddress: string): Promise<string[]> {
    try {
      const result = await this.client.getSafesByOwner(ownerAddress);
      return result.safes;
    } catch (error) {
      this.logger.warn({ err: error }, 'Safes-by-owner lookup failed');
      throw new ProviderException(
        SAFE_PROVIDER_NAME,
        'Unable to fetch Safes for owner',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
