import { Injectable, Logger } from '@nestjs/common';
import { Address, decodeFunctionResult } from 'viem';
import { ENTRY_POINT_GET_NONCE_ABI } from '@integrations/safe/contracts.constant';
import { buildGetNonceCallData } from '@integrations/safe/safe-account.util';
import { SafeService } from '@integrations/safe/safe.service';
import { SOCIAL_RECOVERY_MODULE_ABI } from '@integrations/safe/social-recovery-module.constant';
import { ConfigService } from '@nestjs/config';
import { ChainRpcClient } from '@integrations/chain-rpc/chain-rpc.client';
import { PimlicoClient } from './pimlico.client';
import {
  IGasPriceTier,
  IPimlicoSponsorUserOperationResult,
  IUserOperation,
  IUserOperationReceipt,
} from './types';
import { DEFAULT_ENTRY_POINT } from './constants';
import { IPimlicoConfig } from '@core/config/pimlico.config';

// Business modules depend on this service, never on PimlicoClient directly.
//
// Every throwing method here just logs context then rethrows the caught error as-is -
// PimlicoClient/ChainRpcClient already throw ProviderHttpError (real HTTP status, or
// Pimlico's JSON-RPC error code) for anything that fails, and GlobalExceptionFilter
// knows how to turn that into a proper API response (real status/code, not a blind
// 502) without this layer needing to re-wrap or re-extract anything.
@Injectable()
export class PimlicoService {
  private readonly logger = new Logger(PimlicoService.name);

  private readonly config: IPimlicoConfig;

  constructor(
    private readonly client: PimlicoClient,
    private readonly chainRpcClient: ChainRpcClient,
    private readonly safeService: SafeService,
    configService: ConfigService,
  ) {
    this.config = configService.get<IPimlicoConfig>('pimlico') as IPimlicoConfig;
  }

  async submitUserOperation(
    userOperation: IUserOperation,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<string> {
    try {
      return await this.client.sendUserOperation(userOperation, entryPoint);
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico UserOperation submission failed');
      throw error;
    }
  }

  async getReceipt(userOpHash: string): Promise<IUserOperationReceipt | null> {
    try {
      return await this.client.getUserOperationReceipt(userOpHash);
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico receipt lookup failed');
      throw error;
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
      throw error;
    }
  }

  async isContractDeployed(address: Address): Promise<boolean> {
    try {
      const code = await this.chainRpcClient.getCode(address);
      return Boolean(code) && code !== '0x';
    } catch (error) {
      this.logger.warn({ err: error }, 'Chain RPC getCode lookup failed');
      throw error;
    }
  }

  async getGasPrice(): Promise<IGasPriceTier> {
    try {
      const response = await this.client.getGasPrice();
      return response.standard;
    } catch (error) {
      this.logger.warn({ err: error }, 'Pimlico gas price lookup failed');
      throw error;
    }
  }

  async getAccountNonce(
    accountAddress: Address,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<bigint> {
    try {
      const result = await this.chainRpcClient.ethCall(
        entryPoint,
        buildGetNonceCallData(accountAddress),
      );
      return decodeFunctionResult({
        abi: ENTRY_POINT_GET_NONCE_ABI,
        functionName: 'getNonce',
        data: result as `0x${string}`,
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Chain RPC nonce lookup failed');
      throw error;
    }
  }

  // On-chain reads against the SocialRecoveryModule - same eth_call + decode pattern as
  // getAccountNonce above, via ChainRpcClient (a standard eth_call, not one of Pimlico's
  // bundler/paymaster methods). Module-enablement checks (isModuleEnabled) now go
  // through SafeService (@safe-global/protocol-kit) instead - that's a Safe-native
  // ModuleManager primitive Protocol Kit already provides.

  async getSocialRecoveryNonce(safeAddress: Address): Promise<bigint> {
    try {
      const result = await this.chainRpcClient.ethCall(
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
      throw error;
    }
  }

  async getRecoveryHash(safeAddress: Address, newOwnerAddress: Address): Promise<`0x${string}`> {
    try {
      const nonce = await this.getSocialRecoveryNonce(safeAddress);
      const result = await this.chainRpcClient.ethCall(
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
      throw error;
    }
  }

  // Attempts to sponsor a UserOperation's gas. Returns null (not a throw) when
  // sponsorship is declined - e.g. the configured Sponsorship Policy's per-user,
  // per-transaction, or global cap has been reached - so the caller can fall back to
  // an unsponsored UserOperation rather than treating this as a hard failure.
  async sponsorUserOperation(
    userOperation: IUserOperation,
    entryPoint: string = DEFAULT_ENTRY_POINT,
  ): Promise<IPimlicoSponsorUserOperationResult | null> {
    try {
      return await this.client.sponsorUserOperation(
        userOperation,
        entryPoint,
        this.config.sponsorshipPolicyId,
      );
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Pimlico gas sponsorship declined or unavailable - falling back to unsponsored',
      );
      return null;
    }
  }

  // Native gas-token balance, in wei - only used for the unsponsored fallback path
  // (see WalletService.prepareUserOperation) to fail fast with a clear message.
  async getTokenBalance(tokenAddress: Address, ownerAddress: Address): Promise<bigint> {
    try {
      const balance = await this.chainRpcClient.getTokenBalance(tokenAddress, ownerAddress);
      return BigInt(balance);
    } catch (error) {
      this.logger.warn({ err: error }, 'Chain RPC token balance lookup failed');
      throw error;
    }
  }

  // Used for the LiFi swap-approval check - LiFi has no dedicated allowance API
  // (unlike 1inch's /approve/allowance), so this reads it directly on-chain.
  async getAllowance(
    tokenAddress: Address,
    ownerAddress: Address,
    spenderAddress: Address,
  ): Promise<bigint> {
    try {
      const allowance = await this.chainRpcClient.getAllowance(
        tokenAddress,
        ownerAddress,
        spenderAddress,
      );
      return BigInt(allowance);
    } catch (error) {
      this.logger.warn({ err: error }, 'Chain RPC allowance lookup failed');
      throw error;
    }
  }

  async getNativeBalance(address: Address): Promise<bigint> {
    try {
      const result = await this.chainRpcClient.getBalance(address);
      return BigInt(result);
    } catch (error) {
      this.logger.warn({ err: error }, 'Chain RPC native balance lookup failed');
      throw error;
    }
  }
}