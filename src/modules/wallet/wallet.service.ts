import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, getAddress, Hex } from 'viem';
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
import { IPimlicoConfig } from '@core/config/pimlico.config';
import { WalletRepository } from './repositories/wallet.repository';
import { GasSponsorshipRepository } from './repositories/gas-sponsorship.repository';
import { WalletEntity } from './entities/wallet.entity';
import { PrepareUserOperationDto } from './dto/prepare-user-operation.dto';
import { PreparedUserOperationDto } from './dto/prepared-user-operation.dto';
import { BASE_CHAIN_ID } from './constants';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

@Injectable()
export class WalletService {
  private readonly pimlicoConfig: IPimlicoConfig;

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly gasSponsorshipRepository: GasSponsorshipRepository,
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService,
    private readonly turnkeyService: TurnkeyService,
    private readonly safeService: SafeService,
    private readonly pimlicoService: PimlicoService,
    configService: ConfigService,
  ) {
    this.pimlicoConfig = configService.get<IPimlicoConfig>('pimlico') as IPimlicoConfig;
  }

  async getOrCreatePendingWallet(userId: string): Promise<WalletEntity> {
    const existing = await this.walletRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({ userId, chainId: BASE_CHAIN_ID });
    return this.walletRepository.save(wallet);
  }

  async findByUserId(userId: string): Promise<WalletEntity | null> {
    return this.walletRepository.findByUserId(userId);
  }

  async findBySmartAccountAddress(address: string): Promise<WalletEntity | null> {
    return this.walletRepository.findBySmartAccountAddress(address);
  }

  async getByUserId(
    userId: string,
  ): Promise<WalletEntity & { turnkeyOrganizationId: string | null }> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    const turnkeyOrganizationId = await this.profileService.getProviderReference(
      userId,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
    );

    return { ...wallet, turnkeyOrganizationId };
  }

  async getById(walletId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async requestSmartAccountProvisioning(userId: string): Promise<WalletEntity> {
    const wallet = await this.getByUserId(userId);
    console.log('EXISTING WALLET ROW', wallet.ownerAddress, wallet.smartAccountAddress);

    if (wallet.smartAccountAddress) {
      console.log('EARLY RETURN - already provisioned, not recomputing');
      return wallet;
    }

    const organizationId = await this.profileService.getProviderReference(
      userId,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
    );
    console.log('ORGANIZATION ID USED', organizationId);

    if (!organizationId) {
      throw new ConflictException(
        'Turnkey organization is not linked for this user yet - log in again first',
      );
    }

    const ownerAddress = (await this.turnkeyService.getPrimarySignerAddress(
      organizationId,
    )) as Address;
    console.log('FRESH OWNER ADDRESS FROM TURNKEY', ownerAddress);

    const smartAccountAddress = await this.safeService.predictAddress(ownerAddress);
    console.log('PREDICTED SAFE ADDRESS', smartAccountAddress);

    wallet.ownerAddress = ownerAddress;
    wallet.smartAccountAddress = smartAccountAddress;
    wallet.status = WalletStatus.ACTIVE;

    return this.walletRepository.save(wallet);
  }


  async prepareUserOperation(
    userId: string,
    dto: PrepareUserOperationDto,
  ): Promise<PreparedUserOperationDto> {
    const wallet = await this.getByUserId(userId);
    if (!wallet.smartAccountAddress || !wallet.ownerAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    const sender = wallet.smartAccountAddress as Address;




    console.log("sender", sender)


    const value = BigInt(dto.value ?? '0');
    const data = (dto.data ?? '0x') as Hex;
    await this.validateTransferBalance(sender, dto);

    const [deployed, nonce, gasPrice] = await Promise.all([
      this.pimlicoService.isContractDeployed(sender),
      this.pimlicoService.getAccountNonce(sender),
      this.pimlicoService.getGasPrice(),
    ]);

    console.log("deployed, nonce, gasPrice", deployed, nonce, gasPrice)

    // EntryPoint v0.7 has no single `initCode` field (that's v0.6) - deployment is
    // expressed as separate `factory`/`factoryData` fields instead, present only when
    // the account isn't deployed yet. Sending `initCode` gets Pimlico's schema
    // validator to reject the whole call ("Unrecognized key: initCode").
    let factory: Address | undefined;
    let factoryData: Hex | undefined;
    if (!deployed) {
      const deploymentTx = await this.safeService.buildDeploymentTransaction(
        wallet.ownerAddress as Address,
      );
      factory = deploymentTx.to;
      factoryData = deploymentTx.data;
    }
    const factoryFields = factory && factoryData ? { factory, factoryData } : {};

    const callData = buildExecuteUserOpCallData(getAddress(dto.to), value, data);
    console.log("deployfactoryField", factoryFields, callData)

    // Attempt sponsorship FIRST, before any plain (paymaster-free) gas estimate.
    // pm_sponsorUserOperation both estimates gas AND returns paymaster data in one
    // call, and it has to come first: EntryPoint's simulation requires the sender to
    // be able to pay the UserOp's own prefund when no paymaster is attached, and
    // reverts with "AA21 didn't pay prefund" otherwise. A brand-new, zero-balance smart
    // account - exactly the case sponsored lazy deployment exists for - can never
    // satisfy that, so a plain unsponsored estimate can't be the primary path here.
    // PimlicoService.sponsorUserOperation returns null (not a throw) on decline/failure.
    const sponsorshipAttempt = await this.pimlicoService.sponsorUserOperation(
      {
        sender,
        nonce: `0x${nonce.toString(16)}`,
        ...factoryFields,
        callData,
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        signature: DUMMY_SIGNATURE,
      },
      DEFAULT_ENTRY_POINT,
    );

    let gasEstimate: Record<string, string>;
    let sponsorship: typeof sponsorshipAttempt = null;
    console.log("sponsorshipAttempt gasEstimate", sponsorshipAttempt, sponsorship,)

    if (sponsorshipAttempt) {

      // These gas numbers are valid execution-gas estimates regardless of whether the
      // backend cap check below ends up accepting or declining Pimlico's paymaster offer.
      gasEstimate = {
        callGasLimit: sponsorshipAttempt.callGasLimit,
        verificationGasLimit: sponsorshipAttempt.verificationGasLimit,
        preVerificationGas: sponsorshipAttempt.preVerificationGas,
      };

      // Backend-enforced cap check, independent of Pimlico's own Sponsorship Policy -
      // see IPimlicoConfig.userDailyGasCapWei/userMonthlyGasCapWei. Both checks apply;
      // whichever is stricter wins, since either one can decline sponsorship.
      const sponsoredCost =
        (BigInt(sponsorshipAttempt.callGasLimit) +
          BigInt(sponsorshipAttempt.verificationGasLimit) +
          BigInt(sponsorshipAttempt.preVerificationGas)) *
        BigInt(gasPrice.maxFeePerGas);

      const withinBackendCap = await this.isWithinGasSponsorshipCap(userId, sponsoredCost);
      if (withinBackendCap) {
        sponsorship = sponsorshipAttempt;
      }
      console.log("if ", sponsorshipAttempt, gasEstimate, withinBackendCap)



    } else {
      try {
        gasEstimate = await this.pimlicoService.estimateGas(
          {
            sender,
            nonce: `0x${nonce.toString(16)}`,
            ...factoryFields,
            callData,
            callGasLimit: '0x0',
            verificationGasLimit: '0x0',
            preVerificationGas: '0x0',
            maxFeePerGas: gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
            signature: DUMMY_SIGNATURE,
          },
          DEFAULT_ENTRY_POINT,
        );
      } catch (err) {
        console.log("Asss", err)
        // Sponsorship was declined and the sender can't cover its own prefund either
        // (EntryPoint's AA21 revert) - same outcome as the balance check below, just
        // discovered earlier, during simulation instead of a separate balance query.
        throw new ConflictException(
          'Insufficient gas balance - your sponsorship limit has been reached and your ' +
          'wallet does not have enough balance to cover this transaction.',
        );
      }
    }

    const callGasLimit = sponsorship?.callGasLimit ?? gasEstimate.callGasLimit;
    const verificationGasLimit =
      sponsorship?.verificationGasLimit ?? gasEstimate.verificationGasLimit;
    const preVerificationGas = sponsorship?.preVerificationGas ?? gasEstimate.preVerificationGas;
    console.log("else gasEstimate", gasEstimate, callGasLimit, verificationGasLimit, preVerificationGas)

    if (!sponsorship) {
      console.log("!sponsorship", sponsorship)

      // Sponsorship declined (backend cap, Pimlico's policy cap, or otherwise) - the
      // Safe pays its own gas. Check upfront rather than letting the client sign a
      // UserOp that fails on-chain.
      const totalGas =
        BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas);
      const estimatedCost = totalGas * BigInt(gasPrice.maxFeePerGas);
      const balance = await this.pimlicoService.getNativeBalance(sender);
      console.log("!totalGas", totalGas, estimatedCost, balance)

      if (balance < estimatedCost) {
        throw new ConflictException(
          'Insufficient gas balance - your sponsorship limit has been reached and your ' +
          'wallet does not have enough balance to cover this transaction.',
        );
      }
      console.log("!balance < estimatedCost", balance < estimatedCost)

    } else {
      // Sponsorship granted - record it against the backend cap. Recorded at
      // prepare-time (not after actual on-chain confirmation) since this is what's
      // being committed to sponsor; a minor over-count from abandoned/unsigned
      // prepares is an acceptable tradeoff for a safety cap, not a billing ledger.

      console.log("!belse sponsoredCost")


      const sponsoredCost =
        (BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas)) *
        BigInt(gasPrice.maxFeePerGas);
      await this.gasSponsorshipRepository.save(
        this.gasSponsorshipRepository.create({
          userId,
          amountWei: sponsoredCost.toString(),
          chainId: wallet.chainId,
        }),
      );
      console.log("!belse sponsoredCost", sponsoredCost)

    }

    return new PreparedUserOperationDto({
      sender,
      nonce: `0x${nonce.toString(16)}`,
      factory,
      factoryData,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas: gasPrice.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
      ...(sponsorship
        ? {
          paymaster: sponsorship.paymaster,
          paymasterData: sponsorship.paymasterData,
          paymasterVerificationGasLimit:
            sponsorship.paymasterVerificationGasLimit,
          paymasterPostOpGasLimit:
            sponsorship.paymasterPostOpGasLimit,
        }
        : {}),

    });
  }

  private async validateTransferBalance(
    sender: Address,
    dto: PrepareUserOperationDto,
  ): Promise<void> {
    if (!dto.tokenAddress) {
      const amount = BigInt(dto.value ?? '0');
      const balance = await this.pimlicoService.getNativeBalance(sender);
  
      if (balance < amount) {
        throw new ConflictException('Insufficient ETH balance for transfer');
      }
  
      return;
    }
  
    const tokenAddress = getAddress(dto.tokenAddress);
    const transferAmount = BigInt(dto.tokenAmount ?? '0');
    const balance = await this.pimlicoService.getTokenBalance(tokenAddress, sender);
  
    if (balance < transferAmount) {
      throw new ConflictException('Insufficient token balance for transfer');
    }
  }

  //   async prepareUserOperation(
  //     userId: string,
  //     dto: PrepareUserOperationDto,
  //   ): Promise<PreparedUserOperationDto> {
  //     console.log("dddsd", dto)
  //     const wallet = await this.getByUserId(userId);
  //     if (!wallet.smartAccountAddress || !wallet.ownerAddress) {
  //       throw new ConflictException('Smart account has not been provisioned yet');
  //     }

  //     const sender = wallet.smartAccountAddress as Address;
  //     const value = BigInt(dto.value ?? '0');
  //     const data = (dto.data ?? '0x') as Hex;
  //     console.log("sender", sender, wallet)
  //     const [deployed, nonce, gasPrice] = await Promise.all([
  //       this.pimlicoService.isContractDeployed(sender),
  //       this.pimlicoService.getAccountNonce(sender),
  //       this.pimlicoService.getGasPrice(),
  //     ]);
  //     console.log("promise all", deployed, nonce, gasPrice)

  //     let factory: Address | undefined;
  //     let factoryData: Hex | undefined;
  //     if (!deployed) {
  //       const deploymentTx = await this.safeService.buildDeploymentTransaction(
  //         wallet.ownerAddress as Address,
  //       );
  //       console.log("deploymentTx", deploymentTx)
  //       factory = deploymentTx.to;
  //       factoryData = deploymentTx.data;
  //     }
  //     const factoryFields = factory && factoryData ? { factory, factoryData } : {};
  //     const callData = buildExecuteUserOpCallData(getAddress(dto.to), value, data);
  //     console.log("payload",{sender,
  //         nonce: `0x${nonce.toString(16)}`,
  //         ...factoryFields,
  //         callData,
  //         callGasLimit: '0x0',
  //         verificationGasLimit: '0x0',
  //         preVerificationGas: '0x0',
  //         maxFeePerGas: gasPrice.maxFeePerGas,
  //         maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,

  //         "paymaster": null,
  //       "paymasterVerificationGasLimit": null,
  //       "paymasterPostOpGasLimit": null,
  //       "paymasterData": null,
  //         signature: DUMMY_SIGNATURE,})
  //     const gasEstimate = await this.pimlicoService.estimateGas(
  //       {
  //         sender,
  //         nonce: `0x${nonce.toString(16)}`,
  //         ...factoryFields,
  //         callData,
  //         callGasLimit: '0x0',
  //         verificationGasLimit: '0x0',
  //         preVerificationGas: '0x0',
  //         maxFeePerGas: gasPrice.maxFeePerGas,
  //         maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
  //         // paymaster: '0x',
  //         // paymasterData: '0x',
  //         // paymasterVerificationGasLimit: '0x0',
  //         // paymasterPostOpGasLimit: '0x0',
  //         signature: DUMMY_SIGNATURE,
  //       },
  //       DEFAULT_ENTRY_POINT,
  //     );
  //     console.log("gasEstimate", gasEstimate)
  //     const roughEstimatedCost =
  //       (BigInt(gasEstimate.callGasLimit) +
  //         BigInt(gasEstimate.verificationGasLimit) +
  //         BigInt(gasEstimate.preVerificationGas)) *
  //       BigInt(gasPrice.maxFeePerGas);
  //     console.log("roughEstimatedCost", roughEstimatedCost)

  //     const withinBackendCap = await this.isWithinGasSponsorshipCap(userId, roughEstimatedCost);
  //     console.log("withinBackendCap", roughEstimatedCost)

  //     const sponsorship = withinBackendCap
  //       ? await this.pimlicoService.sponsorUserOperation(
  //         {
  //           sender,
  //           nonce: `0x${nonce.toString(16)}`,
  //           ...factoryFields,
  //           callData,
  //           callGasLimit: gasEstimate.callGasLimit,
  //           verificationGasLimit: gasEstimate.verificationGasLimit,
  //           preVerificationGas: gasEstimate.preVerificationGas,
  //           maxFeePerGas: gasPrice.maxFeePerGas,
  //           maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
  //           signature: DUMMY_SIGNATURE,
  //         },
  //         DEFAULT_ENTRY_POINT,
  //       )
  //       : null;
  //     console.log("sponsorship", sponsorship)

  //     const callGasLimit = sponsorship?.callGasLimit ?? gasEstimate.callGasLimit;
  //     const verificationGasLimit =
  //       sponsorship?.verificationGasLimit ?? gasEstimate.verificationGasLimit;
  //     const preVerificationGas = sponsorship?.preVerificationGas ?? gasEstimate.preVerificationGas;

  //     if (!sponsorship) {
  //       const totalGas =
  //         BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas);
  //       const estimatedCost = totalGas * BigInt(gasPrice.maxFeePerGas);
  //       const balance = await this.pimlicoService.getNativeBalance(sender);

  //       if (balance < estimatedCost) {
  //         throw new ConflictException(
  //           'Insufficient gas balance - your sponsorship limit has been reached and your ' +
  //           'wallet does not have enough balance to cover this transaction.',
  //         );
  //       }
  //     } else {
  //       const sponsoredCost =
  //         (BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas)) *
  //         BigInt(gasPrice.maxFeePerGas);
  //       await this.gasSponsorshipRepository.save(
  //         this.gasSponsorshipRepository.create({
  //           userId,
  //           amountWei: sponsoredCost.toString(),
  //           chainId: wallet.chainId,
  //         }),
  //       );
  //     }
  // console.log("sponsorship",sponsorship)
  //     return new PreparedUserOperationDto({
  //       sender,
  //       nonce: `0x${nonce.toString(16)}`,
  //       factory,
  //       factoryData,
  //       callData,
  //       callGasLimit,
  //       verificationGasLimit,
  //       preVerificationGas,
  //       maxFeePerGas: gasPrice.maxFeePerGas,
  //       maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
  //       paymaster: sponsorship?.paymaster ?? '0x',
  //       paymasterData: sponsorship?.paymasterData ?? '0x',
  //       paymasterVerificationGasLimit: sponsorship?.paymasterVerificationGasLimit ?? '0x0',
  //       paymasterPostOpGasLimit: sponsorship?.paymasterPostOpGasLimit ?? '0x0',
  //       entryPoint: DEFAULT_ENTRY_POINT,
  //     });
  //   }

  private async isWithinGasSponsorshipCap(
    userId: string,
    estimatedCostWei: bigint,
  ): Promise<boolean> {
    const now = Date.now();

    if (this.pimlicoConfig.userDailyGasCapWei) {
      const dailyCap = BigInt(this.pimlicoConfig.userDailyGasCapWei);
      const usedToday = await this.gasSponsorshipRepository.sumSince(
        userId,
        new Date(now - ONE_DAY_MS),
      );
      if (usedToday + estimatedCostWei > dailyCap) {
        return false;
      }
    }

    if (this.pimlicoConfig.userMonthlyGasCapWei) {
      const monthlyCap = BigInt(this.pimlicoConfig.userMonthlyGasCapWei);
      const usedThisMonth = await this.gasSponsorshipRepository.sumSince(
        userId,
        new Date(now - ONE_MONTH_MS),
      );
      if (usedThisMonth + estimatedCostWei > monthlyCap) {
        return false;
      }
    }

    return true;
  }

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