import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Address, decodeFunctionResult } from 'viem';
import { ProviderException } from '@common/exceptions';
import { ENTRY_POINT_GET_NONCE_ABI } from '@integrations/safe/contracts.constant';
import { buildGetNonceCallData } from '@integrations/safe/safe-account.util';
import { SafeService } from '@integrations/safe/safe.service';
import { SOCIAL_RECOVERY_MODULE_ABI } from '@integrations/safe/social-recovery-module.constant';
import { PimlicoClient } from './pimlico.client';
import { IGasPriceTier, IUserOperation, IUserOperationReceipt } from './types';
import { DEFAULT_ENTRY_POINT, PIMLICO_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on PimlicoClient directly.
@Injectable()
export class PimlicoService {
  private readonly logger = new Logger(PimlicoService.name);

  constructor(
    private readonly client: PimlicoClient,
    private readonly safeService: SafeService,
  ) {}

  async submitUserOperation(
    userOperation: IUserOperation,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<string> {
    try {
      return await this.client.sendUserOperation(userOperation, entryPoint);
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico UserOperation submission failed');
      throw new ProviderException(
        PIMLICO_PROVIDER_NAME,
        'Unable to submit transaction to the network',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getReceipt(userOpHash: string): Promise<IUserOperationReceipt | null> {
    try {
      return await this.client.getUserOperationReceipt(userOpHash);
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico receipt lookup failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to fetch transaction receipt');
    }
  }

  async estimateGas(
    userOperation: IUserOperation,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<Record<string, string>> {
    try {
      return await this.client.estimateUserOperationGas(userOperation, entryPoint);
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico gas estimation failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to estimate transaction gas');
    }
  }

  async isContractDeployed(address: Address): Promise<boolean> {
    try {
      const code = await this.client.getCode(address);
      return Boolean(code) && code !== '0x';
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico getCode lookup failed');
      throw new ProviderException(
        PIMLICO_PROVIDER_NAME,
        'Unable to check on-chain deployment status',
      );
    }
  }

  async getGasPrice(): Promise<IGasPriceTier> {
    try {
      const response = await this.client.getGasPrice();
      return response.standard;
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico gas price lookup failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to fetch gas price');
    }
  }

  async getAccountNonce(
    accountAddress: Address,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<bigint> {
    try {
      const result = await this.client.ethCall(entryPoint, buildGetNonceCallData(accountAddress));
      return decodeFunctionResult({
        abi: ENTRY_POINT_GET_NONCE_ABI,
        functionName: 'getNonce',
        data: result as `0x${string}`,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico nonce lookup failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to fetch account nonce');
    }
  }

  // On-chain reads against the SocialRecoveryModule - same eth_call + decode pattern as
  // getAccountNonce above, reused here rather than adding a separate RPC client since
  // Pimlico's endpoint already proxies plain eth_call. Module-enablement checks
  // (isModuleEnabled) now go through SafeService (@safe-global/protocol-kit) instead -
  // that's a Safe-native ModuleManager primitive Protocol Kit already provides.

  async getSocialRecoveryNonce(safeAddress: Address): Promise<bigint> {
    try {
      const result = await this.client.ethCall(
        this.safeService.getRecoveryModuleAddress(),
        this.safeService.buildRecoveryNonceCallData(safeAddress),
      );
      return decodeFunctionResult({
        abi: SOCIAL_RECOVERY_MODULE_ABI,
        functionName: 'nonce',
        data: result as `0x${string}`,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Recovery module nonce lookup failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to fetch recovery nonce');
    }
  }

  async getRecoveryHash(safeAddress: Address, newOwnerAddress: Address): Promise<`0x${string}`> {
    try {
      const nonce = await this.getSocialRecoveryNonce(safeAddress);
      const result = await this.client.ethCall(
        this.safeService.getRecoveryModuleAddress(),
        this.safeService.buildGetRecoveryHashCallData(safeAddress, newOwnerAddress, nonce),
      );
      return decodeFunctionResult({
        abi: SOCIAL_RECOVERY_MODULE_ABI,
        functionName: 'getRecoveryHash',
        data: result as `0x${string}`,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Recovery hash computation failed');
      throw new ProviderException(PIMLICO_PROVIDER_NAME, 'Unable to compute the recovery hash');
    }
  }
}
