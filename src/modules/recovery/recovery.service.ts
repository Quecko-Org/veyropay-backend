import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getAddress } from 'viem';
import { GuardianRepository } from '@modules/guardian/repositories/guardian.repository';
import { GuardianEntity } from '@modules/guardian/entities/guardian.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { ProfileService } from '@modules/profile/profile.service';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletService } from '@modules/wallet/wallet.service';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import {
  NotificationType,
  RecoveryApprovalStatus,
  RecoveryRequestStatus,
  UserStatus,
} from '@shared/enums';
import { RECOVERY_REQUEST_TTL_DAYS } from './constants';
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

@Injectable()
export class RecoveryService {
  constructor(
    private readonly recoveryRequestRepository: RecoveryRequestRepository,
    private readonly recoveryApprovalRepository: RecoveryApprovalRepository,
    private readonly guardianRepository: GuardianRepository,
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
    private readonly notificationService: NotificationService,
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

    const guardians = await this.guardianRepository.findActiveApproversForWallet(wallet.id);
    if (guardians.length === 0) {
      throw new NotFoundException('No recoverable wallet found');
    }

    const existing = await this.recoveryRequestRepository.findPendingByWalletId(wallet.id);
    if (existing) {
      throw new ConflictException('A recovery request is already pending for this wallet');
    }

    let newOwnerAddress: string;
    try {
      newOwnerAddress = getAddress(dto.newOwnerAddress);
    } catch {
      throw new BadRequestException('newOwnerAddress must be a valid EVM address');
    }

    if (wallet.ownerAddress && getAddress(wallet.ownerAddress) === newOwnerAddress) {
      throw new BadRequestException('newOwnerAddress must differ from the current owner');
    }

    const requiredApprovals = resolveRequiredApprovals(guardians.length, wallet.guardianThreshold);
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + RECOVERY_REQUEST_TTL_DAYS);

    const request = await this.recoveryRequestRepository.save(
      this.recoveryRequestRepository.create({
        walletId: wallet.id,
        requestedByEmail: dto.requestedByEmail.trim().toLowerCase(),
        newOwnerAddress,
        requiredApprovals,
        status: RecoveryRequestStatus.PENDING,
        expiresAt,
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
    return toRecoveryRequestDto(request);
  }

  async getRequest(id: string): Promise<RecoveryRequestDto> {
    const request = await this.recoveryRequestRepository.findByIdWithRelations(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }
    return toRecoveryRequestDto(request);
  }

  async listIncoming(callerId: string): Promise<IncomingRecoveryItemDto[]> {
    const caller = await this.profileService.getById(callerId);
    const rows = await this.recoveryApprovalRepository.findIncomingForGuardian(
      callerId,
      caller.email,
    );
    return rows.map(toIncomingItem);
  }

  async approve(callerId: string, approvalId: string): Promise<RecoveryDecisionDto> {
    return this.decide(callerId, approvalId, RecoveryApprovalStatus.APPROVED);
  }

  async decline(callerId: string, approvalId: string): Promise<RecoveryDecisionDto> {
    return this.decide(callerId, approvalId, RecoveryApprovalStatus.REJECTED);
  }

  private async decide(
    callerId: string,
    approvalId: string,
    nextStatus: RecoveryApprovalStatus.APPROVED | RecoveryApprovalStatus.REJECTED,
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

    approval.status = nextStatus;
    approval.decidedAt = new Date();
    await this.recoveryApprovalRepository.save(approval);

    const approvals = request.approvals ?? [];
    const target = approvals.find((row) => row.id === approval.id);
    if (target) {
      target.status = approval.status;
      target.decidedAt = approval.decidedAt;
    }

    const approvedCount = countApproved(approvals);
    const pendingCount = approvals.filter(
      (row) => row.status === RecoveryApprovalStatus.PENDING,
    ).length;

    if (approvedCount >= request.requiredApprovals) {
      request.status = RecoveryRequestStatus.APPROVED;
    } else if (approvedCount + pendingCount < request.requiredApprovals) {
      request.status = RecoveryRequestStatus.REJECTED;
    }

    await this.recoveryRequestRepository.save(request);

    return new RecoveryDecisionDto({
      id: approval.id,
      status: approval.status,
      decidedAt: approval.decidedAt,
      recoveryRequestId: request.id,
      approvalsCount: approvedCount,
      requiredApprovals: request.requiredApprovals,
      recoveryStatus: request.status,
    });
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
    }.`;

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
