import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Address, Hex } from 'viem';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import { WalletStatus } from '@shared/enums';
import { TransactionService } from '@modules/transaction/transaction.service';
import { TransactionEntity } from '@modules/transaction/entities/transaction.entity';
import { ProfileService } from '@modules/profile/profile.service';
import { TurnkeyService } from '@integrations/turnkey/turnkey.service';
import { TURNKEY_ORGANIZATION_PROVIDER_KEY } from '@integrations/turnkey/constants';
import { SafeService } from '@integrations/safe/safe.service';
import { buildExecuteUserOpCallData } from '@integrations/safe/safe-account.util';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { DEFAULT_ENTRY_POINT, DUMMY_SIGNATURE } from '@integrations/pimlico/constants';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletEntity } from './entities/wallet.entity';
import { PrepareUserOperationDto } from './dto/prepare-user-operation.dto';
import { PreparedUserOperationDto } from './dto/prepared-user-operation.dto';
import { BASE_CHAIN_ID } from './constants';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService,
    private readonly turnkeyService: TurnkeyService,
    private readonly safeService: SafeService,
    private readonly pimlicoService: PimlicoService,
  ) {}

  // Called during login/profile bootstrap so wallet creation is automatic and
  // transparent per docs/02_PRODUCT_REQUIREMENTS.md - the row exists in
  // PENDING_PROVIDER status immediately, the on-chain address is assigned once
  // requestSmartAccountProvisioning() runs.
  async getOrCreatePendingWallet(userId: string): Promise<WalletEntity> {
    const existing = await this.walletRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({ userId, chainId: BASE_CHAIN_ID });
    return this.walletRepository.save(wallet);
  }

  async getByUserId(userId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getById(walletId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  // Owner (signer) is the Ethereum address Turnkey already provisioned for the
  // user's sub-organization during client-side onboarding - the backend never
  // creates key material, it only reads that address and predicts the
  // corresponding counterfactual Safe address (single owner, threshold 1, with
  // the Safe4337Module enabled for ERC-4337 support). Idempotent: safe to call
  // again once already provisioned.
  async requestSmartAccountProvisioning(userId: string): Promise<WalletEntity> {
    const wallet = await this.getByUserId(userId);
    if (wallet.smartAccountAddress) {
      return wallet;
    }

    const organizationId = await this.profileService.getProviderReference(
      userId,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
    );

    if (!organizationId) {
      throw new ConflictException(
        'Turnkey organization is not linked for this user yet - log in again first',
      );
    }

    const ownerAddress = (await this.turnkeyService.getPrimarySignerAddress(
      organizationId,
    )) as Address;
    const smartAccountAddress = await this.safeService.predictAddress(ownerAddress);

    wallet.ownerAddress = ownerAddress;
    wallet.smartAccountAddress = smartAccountAddress;
    wallet.status = WalletStatus.ACTIVE;

    return this.walletRepository.save(wallet);
  }

  // Fills in the fields the client cannot compute itself (nonce, deployment
  // initCode, gas) for an unsigned ERC-4337 UserOperation. The client signs the
  // result locally via Turnkey and submits it back through POST /transfer -
  // the backend never holds or produces a signature.
  async prepareUserOperation(
    userId: string,
    dto: PrepareUserOperationDto,
  ): Promise<PreparedUserOperationDto> {
    const wallet = await this.getByUserId(userId);
    if (!wallet.smartAccountAddress || !wallet.ownerAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    const sender = wallet.smartAccountAddress as Address;
    const value = BigInt(dto.value ?? '0');
    const data = (dto.data ?? '0x') as Hex;

    const [deployed, nonce, gasPrice] = await Promise.all([
      this.pimlicoService.isContractDeployed(sender),
      this.pimlicoService.getAccountNonce(sender),
      this.pimlicoService.getGasPrice(),
    ]);

    let initCode: Hex = '0x';
    if (!deployed) {
      const deploymentTx = await this.safeService.buildDeploymentTransaction(
        wallet.ownerAddress as Address,
      );
      initCode = (deploymentTx.to + deploymentTx.data.slice(2)) as Hex;
    }

    const callData = buildExecuteUserOpCallData(dto.to as Address, value, data);

    const gasEstimate = await this.pimlicoService.estimateGas(
      {
        sender,
        nonce: `0x${nonce.toString(16)}`,
        initCode,
        callData,
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: DUMMY_SIGNATURE,
      },
      DEFAULT_ENTRY_POINT,
    );

    return new PreparedUserOperationDto({
      sender,
      nonce: `0x${nonce.toString(16)}`,
      initCode,
      callData,
      callGasLimit: gasEstimate.callGasLimit,
      verificationGasLimit: gasEstimate.verificationGasLimit,
      preVerificationGas: gasEstimate.preVerificationGas,
      maxFeePerGas: gasPrice.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
      paymasterAndData: '0x',
      entryPoint: DEFAULT_ENTRY_POINT,
    });
  }

  // Configurable N-of-M guardian recovery threshold - bounds-checked against the
  // caller-supplied active guardian count (GuardianRecoveryModule owns the guardian
  // list, so it computes that count and passes it in rather than WalletService
  // depending on GuardianRepository).
  async setGuardianThreshold(
    userId: string,
    threshold: number,
    activeGuardianCount: number,
  ): Promise<WalletEntity> {
    const wallet = await this.getByUserId(userId);

    if (activeGuardianCount === 0) {
      throw new ConflictException('This wallet has no active guardians to set a threshold for');
    }
    if (threshold < 1 || threshold > activeGuardianCount) {
      throw new ConflictException(
        `threshold must be between 1 and the active guardian count (${activeGuardianCount})`,
      );
    }

    wallet.guardianThreshold = threshold;
    return this.walletRepository.save(wallet);
  }

  async listTransactions(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<TransactionEntity>> {
    const wallet = await this.getByUserId(userId);
    return this.transactionService.listForWallet(wallet.id, query);
  }
}
