import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Address, getAddress, Hex, recoverAddress } from 'viem';
import { GuardianRepository } from '@modules/guardian/repositories/guardian.repository';
import { GuardianEntity } from '@modules/guardian/entities/guardian.entity';
import { AuthService, IRequestMetadata } from '@modules/auth/auth.service';
import { AuthTokensDto } from '@modules/auth/dto/auth-tokens.dto';
import { NotificationService } from '@modules/notification/notification.service';
import { ProfileService } from '@modules/profile/profile.service';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletService } from '@modules/wallet/wallet.service';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { RelayerService } from '@integrations/pimlico/relayer.service';
import { SafeService } from '@integrations/safe/safe.service';
import { buildRecoveryTypedData } from '@integrations/safe/recovery-typed-data';
import { IGuardianSignature } from '@integrations/safe/social-recovery.util';
import { TurnkeyService } from '@integrations/turnkey/turnkey.service';
import { TURNKEY_ORGANIZATION_PROVIDER_KEY } from '@integrations/turnkey/constants';
import {
  NotificationType,
  RecoveryApprovalStatus,
  RecoveryRequestStatus,
  UserStatus,
} from '@shared/enums';
import { RECOVERY_REQUEST_TTL_DAYS } from './constants';
import { CancelRecoveryDto } from './dto/cancel-recovery.dto';
import { ClaimRecoveryDto } from './dto/claim-recovery.dto';
import { CreateRecoveryRequestDto } from './dto/create-recovery-request.dto';
import {
  IncomingRecoveryItemDto,
  RecoveryDecisionDto,
  RecoveryLookupDto,
  RecoveryRequestDto,
  countApproved,
  resolveRequiredApprovals,
  toGuardianSummary,
  toIncomingItem,
  toOwnerCard,
  toRecoveryRequestDto,
  toWalletCard,
} from './dto/recovery-response.dto';
import { RecoveryApprovalEntity } from './entities/recovery-approval.entity';
import { RecoveryApprovalRepository } from './repositories/recovery-approval.repository';
import { RecoveryRequestRepository } from './repositories/recovery-request.repository';
import { RecoveryRequestEntity } from './entities/recovery-request.entity';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    private readonly recoveryRequestRepository: RecoveryRequestRepository,
    private readonly recoveryApprovalRepository: RecoveryApprovalRepository,
    private readonly guardianRepository: GuardianRepository,
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
    private readonly notificationService: NotificationService,
    private readonly pimlicoService: PimlicoService,
    private readonly relayerService: RelayerService,
    private readonly safeService: SafeService,
    private readonly turnkeyService: TurnkeyService,
    private readonly authService: AuthService,
  ) {}

  async lookupByEmail(email: string): Promise<RecoveryLookupDto> {
    const user = await this.profileService.findByEmail(email.trim().toLowerCase());
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No recoverable wallet found');
    }

    const wallet = await this.walletService.findByUserId(user.id);
    if (!wallet) {
      throw new NotFoundException('No recoverable wallet found');
    }

    return this.toLookup(wallet, user);
  }

  async lookupByAddress(address: string): Promise<RecoveryLookupDto> {
    const wallet = await this.walletService.findBySmartAccountAddress(address);
    if (!wallet) {
      throw new NotFoundException('No recoverable wallet found');
    }

    let user: UserEntity;
    try {
      user = await this.profileService.getById(wallet.userId);
    } catch {
      throw new NotFoundException('No recoverable wallet found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No recoverable wallet found');
    }

    return this.toLookup(wallet, user);
  }

  async createRequest(dto: CreateRecoveryRequestDto): Promise<RecoveryRequestDto> {
    const wallet = await this.walletService.getById(dto.walletId);
    const owner = await this.profileService.getById(wallet.userId);
    if (owner.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No recoverable wallet found');
    }

    if (!wallet.smartAccountAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    const guardians = await this.guardianRepository.findActiveApproversForWallet(wallet.id);
    if (guardians.length === 0) {
      throw new NotFoundException('No recoverable wallet found');
    }

    const missingAddress = guardians.find((guardian) => !guardian.guardianAddress);
    if (missingAddress) {
      throw new ConflictException(
        'Every guardian must have an on-chain signer address before recovery can start',
      );
    }

    const existing = await this.recoveryRequestRepository.findActiveByWalletId(wallet.id);
    if (existing) {
      throw new ConflictException(
        existing.status === RecoveryRequestStatus.APPROVED
          ? 'A recovery request is already approved and awaiting on-chain execution for this wallet - retry execute or cancel it first'
          : 'A recovery request is already pending for this wallet',
      );
    }

    let newOwnerAddress: Address;
    try {
      newOwnerAddress = getAddress(dto.newOwnerAddress);
    } catch {
      throw new BadRequestException('newOwnerAddress must be a valid EVM address');
    }

    if (wallet.ownerAddress && getAddress(wallet.ownerAddress) === newOwnerAddress) {
      throw new BadRequestException('newOwnerAddress must differ from the current owner');
    }

    const safeAddress = getAddress(wallet.smartAccountAddress);
    await this.assertGuardiansOnChain(safeAddress, guardians);

    let recoveryHash: Hex;
    let recoveryNonce: bigint;
    try {
      const result = await this.pimlicoService.getRecoveryHashWithNonce(
        safeAddress,
        newOwnerAddress,
      );
      recoveryHash = result.hash;
      recoveryNonce = result.nonce;
    } catch (error) {
      this.logger.warn({ err: error }, 'Unable to read SocialRecoveryModule hash');
      throw new ConflictException(
        'Social recovery module is unavailable or not enabled for this Safe - ' +
          'register guardians on-chain first',
      );
    }

    const requiredApprovals = resolveRequiredApprovals(guardians.length, wallet.guardianThreshold);
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + RECOVERY_REQUEST_TTL_DAYS);

    const requestedByEmail = (dto.requestedByEmail ?? owner.email)?.trim().toLowerCase();
    if (!requestedByEmail) {
      throw new ConflictException('Unable to resolve requester email for this wallet');
    }

    const request = await this.recoveryRequestRepository.save(
      this.recoveryRequestRepository.create({
        walletId: wallet.id,
        requestedByEmail,
        newOwnerAddress,
        requiredApprovals,
        status: RecoveryRequestStatus.PENDING,
        expiresAt,
        recoveryHash,
        recoveryNonce: recoveryNonce.toString(),
      }),
    );

    const approvals: RecoveryApprovalEntity[] = [];
    for (const guardian of guardians) {
      const saved = await this.recoveryApprovalRepository.save(
        this.recoveryApprovalRepository.create({
          recoveryRequestId: request.id,
          guardianId: guardian.id,
          status: RecoveryApprovalStatus.PENDING,
        }),
      );
      saved.guardian = guardian;
      approvals.push(saved);
    }

    await this.notifyGuardians(owner, wallet, guardians);

    request.wallet = wallet;
    request.approvals = approvals;
    return toRecoveryRequestDto(request, this.typedDataFor(request, wallet));
  }

  async listRequests(
    walletId: string,
    status?: RecoveryRequestStatus,
  ): Promise<RecoveryRequestDto[]> {
    await this.walletService.getById(walletId);
    const rows = await this.recoveryRequestRepository.findByWalletIdWithRelations(
      walletId,
      status,
    );
    return rows.map((row) => toRecoveryRequestDto(row, this.typedDataFor(row, row.wallet)));
  }

  async getRequest(id: string): Promise<RecoveryRequestDto> {
    const request = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }
    return toRecoveryRequestDto(request, this.typedDataFor(request, request.wallet));
  }

  async listIncoming(callerId: string): Promise<IncomingRecoveryItemDto[]> {
    const caller = await this.profileService.getById(callerId);
    const rows = await this.recoveryApprovalRepository.findIncomingForGuardian(
      callerId,
      caller.email,
    );
    return rows.map((row) =>
      toIncomingItem(row, this.typedDataFor(row.recoveryRequest, row.recoveryRequest?.wallet)),
    );
  }

  async approve(
    callerId: string,
    approvalId: string,
    signature: string,
  ): Promise<RecoveryDecisionDto> {
    return this.decide(callerId, approvalId, RecoveryApprovalStatus.APPROVED, signature);
  }

  async decline(callerId: string, approvalId: string): Promise<RecoveryDecisionDto> {
    return this.decide(callerId, approvalId, RecoveryApprovalStatus.REJECTED);
  }

  async retryExecute(id: string): Promise<RecoveryRequestDto> {
    const request = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (request.status === RecoveryRequestStatus.EXECUTED) {
      return toRecoveryRequestDto(request, this.typedDataFor(request, request.wallet));
    }

    if (request.status !== RecoveryRequestStatus.APPROVED) {
      throw new ConflictException(
        'Only an approved recovery request can be executed on-chain - wait for guardian threshold',
      );
    }

    if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
      request.status = RecoveryRequestStatus.EXPIRED;
      await this.recoveryRequestRepository.save(request);
      throw new ConflictException('This recovery request has expired');
    }

    await this.executeOnChain(request);
    const refreshed = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!refreshed) {
      throw new NotFoundException('Recovery request not found');
    }
    if (refreshed.status !== RecoveryRequestStatus.EXECUTED) {
      throw new ConflictException(
        refreshed.failureReason ?? 'On-chain recovery execution failed - retry later',
      );
    }
    return toRecoveryRequestDto(refreshed, this.typedDataFor(refreshed, refreshed.wallet));
  }

  async cancel(id: string, dto: CancelRecoveryDto): Promise<RecoveryRequestDto> {
    const request = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (
      request.status !== RecoveryRequestStatus.PENDING &&
      request.status !== RecoveryRequestStatus.APPROVED
    ) {
      throw new ConflictException(
        'Only pending or approved (not yet executed) recovery can be cancelled',
      );
    }

    if (request.executionTxHash) {
      throw new ConflictException('Recovery already executed on-chain and cannot be cancelled');
    }

    const email = dto.email.trim().toLowerCase();
    const ownerEmail = request.wallet?.user?.email?.trim().toLowerCase();
    const allowed =
      email === request.requestedByEmail.trim().toLowerCase() ||
      (ownerEmail !== undefined && email === ownerEmail);
    if (!allowed) {
      throw new NotFoundException('Recovery request not found');
    }

    request.status = RecoveryRequestStatus.CANCELLED;
    await this.recoveryRequestRepository.save(request);
    return toRecoveryRequestDto(request, this.typedDataFor(request, request.wallet));
  }

  // Final step after EXECUTED: prove Turnkey session controls newOwnerAddress, confirm
  // on-chain Safe ownership, rebind the wallet owner identity, issue app JWTs.
  async claim(
    id: string,
    dto: ClaimRecoveryDto,
    meta: IRequestMetadata,
  ): Promise<AuthTokensDto> {
    const request = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (request.status !== RecoveryRequestStatus.EXECUTED || !request.executionTxHash) {
      throw new ConflictException(
        'Recovery must be fully executed on-chain before the owner can open the wallet - call execute if stuck at approved',
      );
    }

    const wallet = request.wallet ?? (await this.walletService.getById(request.walletId));
    if (!wallet.smartAccountAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    const identity = await this.turnkeyService.verifySessionToken(dto.sessionJwt);
    const controls = await this.turnkeyService.organizationControlsAddress(
      identity.organizationId,
      request.newOwnerAddress,
    );
    if (!controls) {
      throw new BadRequestException(
        'Turnkey session does not control newOwnerAddress - stampLogin with the recovery passkey first',
      );
    }

    await this.assertOnChainOwner(wallet.smartAccountAddress, request.newOwnerAddress);

    if (
      !wallet.ownerAddress ||
      getAddress(wallet.ownerAddress) !== getAddress(request.newOwnerAddress)
    ) {
      wallet.ownerAddress = getAddress(request.newOwnerAddress);
      await this.walletService.save(wallet);
    }

    await this.profileService.rebindTurnkeyIdentity(wallet.userId, identity.userId);
    await this.profileService.setProviderReference(
      wallet.userId,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
      identity.organizationId,
    );

    await this.cancelSiblingActiveRequests(wallet.id, request.id);

    return this.authService.openSessionForUser(wallet.userId, meta, {
      deviceName: dto.deviceName,
      platform: dto.platform,
      revokeOthers: true,
    });
  }

  private async decide(
    callerId: string,
    approvalId: string,
    nextStatus: RecoveryApprovalStatus.APPROVED | RecoveryApprovalStatus.REJECTED,
    signature?: string,
  ): Promise<RecoveryDecisionDto> {
    const caller = await this.profileService.getById(callerId);
    const approval = await this.recoveryApprovalRepository.findByIdWithRelations(approvalId);
    if (!approval || !this.isGuardianInvitee(approval.guardian, caller)) {
      throw new NotFoundException('Recovery approval not found');
    }

    const request = approval.recoveryRequest;
    if (!request || request.status !== RecoveryRequestStatus.PENDING) {
      throw new ConflictException('This recovery request is no longer pending');
    }

    if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
      request.status = RecoveryRequestStatus.EXPIRED;
      await this.recoveryRequestRepository.save(request);
      throw new ConflictException('This recovery request has expired');
    }

    if (approval.status !== RecoveryApprovalStatus.PENDING) {
      throw new ConflictException('This approval has already been decided');
    }

    if (nextStatus === RecoveryApprovalStatus.APPROVED) {
      if (!signature) {
        throw new BadRequestException('signature is required to approve recovery');
      }
      await this.assertValidGuardianSignature(approval.guardian, request, signature);
      approval.signature = signature;
    }

    approval.status = nextStatus;
    approval.decidedAt = new Date();
    await this.recoveryApprovalRepository.save(approval);

    const approvals = request.approvals ?? [];
    const target = approvals.find((row) => row.id === approval.id);
    if (target) {
      target.status = approval.status;
      target.decidedAt = approval.decidedAt;
      target.signature = approval.signature;
    }

    let approvedCount = countApproved(approvals);
    const pendingCount = approvals.filter(
      (row) => row.status === RecoveryApprovalStatus.PENDING,
    ).length;

    if (approvedCount >= request.requiredApprovals) {
      request.status = RecoveryRequestStatus.APPROVED;
      await this.recoveryRequestRepository.save(request);
      await this.executeOnChain(request);
      approvedCount = countApproved(request.approvals ?? approvals);
    } else if (approvedCount + pendingCount < request.requiredApprovals) {
      request.status = RecoveryRequestStatus.REJECTED;
      await this.recoveryRequestRepository.save(request);
    } else {
      await this.recoveryRequestRepository.save(request);
    }

    return new RecoveryDecisionDto({
      id: approval.id,
      status: approval.status,
      decidedAt: approval.decidedAt,
      recoveryRequestId: request.id,
      approvalsCount: approvedCount,
      requiredApprovals: request.requiredApprovals,
      recoveryStatus: request.status,
      executionTxHash: request.executionTxHash,
    });
  }

  private async executeOnChain(request: RecoveryRequestEntity): Promise<void> {
    const wallet = request.wallet ?? (await this.walletService.getById(request.walletId));
    if (!wallet.smartAccountAddress || !request.recoveryHash) {
      request.failureReason = 'Missing smart account or recovery hash';
      await this.recoveryRequestRepository.save(request);
      return;
    }

    const approvals = (request.approvals ?? []).filter(
      (row) =>
        row.status === RecoveryApprovalStatus.APPROVED &&
        row.signature &&
        row.guardian?.guardianAddress,
    );

    if (approvals.length < request.requiredApprovals) {
      request.failureReason = 'Not enough signed guardian approvals';
      await this.recoveryRequestRepository.save(request);
      return;
    }

    const signatures: IGuardianSignature[] = approvals
      .slice(0, request.requiredApprovals)
      .map((row) => ({
        signer: getAddress(row.guardian.guardianAddress as string),
        signature: row.signature as Hex,
      }))
      .sort((a, b) => a.signer.toLowerCase().localeCompare(b.signer.toLowerCase()));

    const safeAddress = getAddress(wallet.smartAccountAddress);
    const newOwner = getAddress(request.newOwnerAddress);
    const calldata = this.safeService.buildMultiConfirmRecoveryCallData(
      safeAddress,
      newOwner,
      signatures,
    );

    try {
      const txHash = await this.relayerService.relayTransaction(
        this.safeService.getRecoveryModuleAddress(),
        calldata,
      );
      request.status = RecoveryRequestStatus.EXECUTED;
      request.executedAt = new Date();
      request.executionTxHash = txHash;
      request.failureReason = undefined;
      wallet.ownerAddress = newOwner;
      await this.walletService.save(wallet);
      await this.recoveryRequestRepository.save(request);
      await this.cancelSiblingActiveRequests(wallet.id, request.id);
    } catch (error) {
      this.logger.warn({ err: error, requestId: request.id }, 'On-chain recovery execution failed');
      request.failureReason =
        error instanceof Error ? error.message : 'On-chain recovery execution failed';
      await this.recoveryRequestRepository.save(request);
    }
  }

  private async cancelSiblingActiveRequests(walletId: string, exceptId: string): Promise<void> {
    const siblings = await this.recoveryRequestRepository.findActiveOthersByWalletId(
      walletId,
      exceptId,
    );
    for (const sibling of siblings) {
      sibling.status = RecoveryRequestStatus.CANCELLED;
      await this.recoveryRequestRepository.save(sibling);
    }
  }

  private async assertOnChainOwner(safeAddress: string, newOwnerAddress: string): Promise<void> {
    let owners: string[];
    try {
      const info = await this.safeService.getSafeInfo(safeAddress);
      owners = info.owners;
    } catch (error) {
      this.logger.warn({ err: error, safeAddress }, 'Unable to read Safe owners for claim');
      throw new ConflictException('Unable to verify on-chain Safe ownership - try again shortly');
    }

    const target = getAddress(newOwnerAddress);
    const matches = owners.some((owner) => {
      try {
        return getAddress(owner) === target;
      } catch {
        return false;
      }
    });
    if (!matches) {
      throw new ConflictException(
        'On-chain Safe owner has not changed to newOwnerAddress yet - wait for execution confirmation',
      );
    }
  }

  private async assertValidGuardianSignature(
    guardian: GuardianEntity,
    request: RecoveryRequestEntity,
    signature: string,
  ): Promise<void> {
    if (!guardian.guardianAddress) {
      throw new ConflictException('Guardian has no on-chain signer address');
    }
    if (!request.recoveryHash) {
      throw new ConflictException('Recovery hash is missing - recreate the recovery request');
    }

    let recovered: Address;
    try {
      recovered = await recoverAddress({
        hash: request.recoveryHash as Hex,
        signature: signature as Hex,
      });
    } catch {
      throw new BadRequestException('Invalid guardian signature');
    }

    if (getAddress(recovered) !== getAddress(guardian.guardianAddress)) {
      throw new BadRequestException(
        'Signature does not match this guardian on-chain address - recovery cannot be DB-only',
      );
    }
  }

  private async assertGuardiansOnChain(
    safeAddress: Address,
    guardians: GuardianEntity[],
  ): Promise<void> {
    for (const guardian of guardians) {
      const address = getAddress(guardian.guardianAddress as string);
      let onChain: boolean;
      try {
        onChain = await this.pimlicoService.isSocialRecoveryGuardian(safeAddress, address);
      } catch {
        throw new ConflictException(
          'Unable to verify guardians on the SocialRecoveryModule - ensure the module is enabled',
        );
      }
      if (!onChain) {
        throw new ConflictException(
          `Guardian ${guardian.guardianEmail} is not registered on-chain for this Safe`,
        );
      }
    }
  }

  private typedDataFor(
    request: RecoveryRequestEntity | undefined,
    wallet: WalletEntity | undefined,
  ): Record<string, unknown> | undefined {
    if (!request?.recoveryHash || !request.recoveryNonce || !wallet?.smartAccountAddress) {
      return undefined;
    }

    try {
      return buildRecoveryTypedData({
        chainId: wallet.chainId,
        verifyingContract: this.safeService.getRecoveryModuleAddress(),
        wallet: getAddress(wallet.smartAccountAddress),
        newOwners: [getAddress(request.newOwnerAddress)],
        newThreshold: 1n,
        nonce: BigInt(request.recoveryNonce),
      }) as unknown as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private async toLookup(wallet: WalletEntity, owner: UserEntity): Promise<RecoveryLookupDto> {
    const guardians = await this.guardianRepository.findActiveApproversForWallet(wallet.id);
    if (guardians.length === 0) {
      throw new NotFoundException('No recoverable wallet found');
    }

    return new RecoveryLookupDto({
      wallet: toWalletCard(wallet),
      owner: toOwnerCard(owner, true),
      guardiansRegistered: guardians.length,
      approvalsNeeded: resolveRequiredApprovals(guardians.length, wallet.guardianThreshold),
      guardiansCanMoveFunds: guardians.some((guardian) => guardian.canMoveFunds),
      guardians: guardians.map(toGuardianSummary),
    });
  }

  private isGuardianInvitee(guardian: GuardianEntity, caller: UserEntity): boolean {
    if (guardian.guardianUserId && guardian.guardianUserId === caller.id) {
      return true;
    }
    if (!caller.email || !guardian.guardianEmail) {
      return false;
    }
    return caller.email.trim().toLowerCase() === guardian.guardianEmail.trim().toLowerCase();
  }

  private async notifyGuardians(
    owner: UserEntity,
    wallet: WalletEntity,
    guardians: GuardianEntity[],
  ): Promise<void> {
    const title = 'Recovery request';
    const body = `${owner.displayName ?? 'A user'} asked you to approve wallet recovery for ${
      wallet.smartAccountAddress ?? 'their wallet'
    }. Sign with your Turnkey guardian key.`;

    for (const guardian of guardians) {
      if (!guardian.guardianUserId) {
        continue;
      }

      await this.notificationService.notify(
        guardian.guardianUserId,
        NotificationType.RECOVERY,
        title,
        body,
      );
    }
  }
}
