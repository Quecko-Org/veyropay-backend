import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Address } from 'viem';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { toSkipTake } from '@common/utils';
import { PaginatedResultDto, PaginationQueryDto } from '@shared/dto';
import {
  GuardianStatus,
  NotificationType,
  RecoveryApprovalStatus,
  RecoveryRequestStatus,
} from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { ProfileService } from '@modules/profile/profile.service';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { SafeService } from '@integrations/safe/safe.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { RelayerService } from '@integrations/pimlico/relayer.service';
import { SendgridService } from '@integrations/sendgrid/sendgrid.service';
import { IGuardianSignature } from '@integrations/safe/social-recovery.util';
import { GuardianRepository } from '../repositories/guardian.repository';
import { RecoveryRequestRepository } from '../repositories/recovery-request.repository';
import { RecoveryApprovalRepository } from '../repositories/recovery-approval.repository';
import { RecoveryRequestEntity } from '../entities/recovery-request.entity';
import { CreateRecoveryRequestDto } from '../dto/create-recovery-request.dto';
import { SubmitApprovalDto } from '../dto/submit-approval.dto';
import { RECOVERY_REQUEST_EXPIRY_HOURS } from '../constants/guardian-recovery.constant';

export type ApprovalDecision = 'approved' | 'rejected';

// Off-chain approval workflow (create request, collect guardian approvals, track
// status/history) is fully implemented. Executing an approved recovery on-chain is now
// implemented too - see executeRecovery() below - using Safe's official
// SocialRecoveryModule with this backend acting as a gas-sponsoring relayer. See
// docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1 for the one open item that remains: that
// module's official deployment does not (as of this writing) cover Base, this
// project's target chain.
@Injectable()
export class RecoveryRequestService {
  private readonly logger = new Logger(RecoveryRequestService.name);

  constructor(
    private readonly recoveryRequestRepository: RecoveryRequestRepository,
    private readonly recoveryApprovalRepository: RecoveryApprovalRepository,
    private readonly guardianRepository: GuardianRepository,
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
    private readonly notificationService: NotificationService,
    private readonly systemService: SystemService,
    private readonly safeService: SafeService,
    private readonly pimlicoService: PimlicoService,
    private readonly relayerService: RelayerService,
    private readonly sendgridService: SendgridService,
  ) {}

  // Unauthenticated by design - the requester has lost access to their session. Returns
  // null (not an error) when no matching account exists, so the controller can respond
  // identically either way and avoid leaking account existence.
  async createRequest(dto: CreateRecoveryRequestDto): Promise<RecoveryRequestEntity | null> {
    const user = await this.profileService.findByEmail(dto.email);
    if (!user) {
      return null;
    }

    const wallet = await this.walletService.getByUserId(user.id);

    const existingPending = await this.recoveryRequestRepository.findPendingByWalletId(wallet.id);
    if (existingPending) {
      throw new ConflictException('A recovery request is already pending for this wallet');
    }

    const guardians = await this.guardianRepository.findActiveByWalletId(wallet.id);
    if (guardians.length === 0) {
      throw new ConflictException('This wallet has no active guardians configured');
    }

    const expiresAt = new Date(Date.now() + RECOVERY_REQUEST_EXPIRY_HOURS * 60 * 60 * 1000);

    // Configurable N-of-M threshold (wallet.guardianThreshold), falling back to the
    // original "every active guardian must approve" MVP policy when unset. Clamped to
    // the current active guardian count in case the wallet's threshold was set before
    // guardians were later removed.
    const requiredApprovals = Math.min(
      wallet.guardianThreshold ?? guardians.length,
      guardians.length,
    );

    const request = this.recoveryRequestRepository.create({
      walletId: wallet.id,
      requestedByEmail: dto.email,
      newOwnerAddress: dto.newOwnerAddress,
      requiredApprovals,
      status: RecoveryRequestStatus.PENDING,
      expiresAt,
    });

    // The EIP-712 hash guardians must sign to approve this exact request on-chain.
    // Requires the SocialRecoveryModule already enabled on the wallet (an additive,
    // opt-in step - see GuardianService.getRecoveryModuleSetupCalldata). Left null when
    // not yet enabled: the off-chain approval workflow still works, only on-chain
    // execution is gated on it later (see executeRecovery).
    if (wallet.smartAccountAddress) {
      try {
        request.recoveryHash = await this.pimlicoService.getRecoveryHash(
          wallet.smartAccountAddress as Address,
          dto.newOwnerAddress as Address,
        );
      } catch (error) {
        this.logger.warn(
          { err: error, walletId: wallet.id },
          'Recovery hash not computed - SocialRecoveryModule may not be enabled on this wallet yet',
        );
      }
    }

    const saved = await this.recoveryRequestRepository.save(request);

    await Promise.all(
      guardians.map((guardian) =>
        this.recoveryApprovalRepository.save(
          this.recoveryApprovalRepository.create({
            recoveryRequestId: saved.id,
            guardianId: guardian.id,
            status: RecoveryApprovalStatus.PENDING,
          }),
        ),
      ),
    );

    await this.notificationService.notify(
      user.id,
      NotificationType.RECOVERY,
      'Recovery requested',
      'A wallet recovery request was initiated on your account. If this was not you, contact support immediately.',
    );

    if (user.email) {
      await this.sendgridService.sendRecoveryRequested({
        to: user.email,
        recoveryRequestUrl: `/guardian-recovery/recovery-requests/${saved.id}`,
      });
    }

    await Promise.all(
      guardians
        .filter((guardian) => guardian.guardianUserId)
        .map((guardian) =>
          this.notificationService.notify(
            guardian.guardianUserId as string,
            NotificationType.RECOVERY,
            'Recovery approval needed',
            'A wallet recovery request needs your approval as a guardian.',
          ),
        ),
    );

    await this.systemService.recordAudit('recovery.requested', user.id, {
      recoveryRequestId: saved.id,
      walletId: wallet.id,
    });

    return saved;
  }

  // Public by design (the requester has no session) - the request ID (a UUIDv4) is the
  // access credential, the same trust model used for guardian invitation tokens.
  async getById(id: string): Promise<RecoveryRequestEntity> {
    const request = await this.recoveryRequestRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (
      request.status === RecoveryRequestStatus.PENDING &&
      request.expiresAt &&
      request.expiresAt < new Date()
    ) {
      request.status = RecoveryRequestStatus.EXPIRED;
      await this.recoveryRequestRepository.save(request);
      await this.systemService.recordAudit('recovery.expired', undefined, {
        recoveryRequestId: request.id,
      });
    }

    return request;
  }

  // Authenticated by the guardian's invitation token, not a JWT - guardians may not
  // have platform accounts.
  async submitApproval(
    requestId: string,
    guardianToken: string,
    decision: ApprovalDecision,
    dto: SubmitApprovalDto,
  ): Promise<RecoveryRequestEntity> {
    const guardian = await this.guardianRepository.findByInvitationToken(guardianToken);
    if (!guardian || guardian.status !== GuardianStatus.ACTIVE) {
      throw new ForbiddenException('Invalid or inactive guardian credential');
    }

    const request = await this.getById(requestId);
    if (request.walletId !== guardian.walletId) {
      throw new ForbiddenException('This guardian is not authorized for this recovery request');
    }
    if (request.status !== RecoveryRequestStatus.PENDING) {
      throw new ConflictException(
        `Recovery request is ${request.status}, no longer accepting approvals`,
      );
    }

    const approval = await this.recoveryApprovalRepository.findByRequestAndGuardian(
      requestId,
      guardian.id,
    );
    if (!approval) {
      throw new NotFoundException('Approval record not found for this guardian');
    }
    if (approval.status !== RecoveryApprovalStatus.PENDING) {
      throw new ConflictException('This guardian has already responded to this request');
    }

    approval.status =
      decision === 'approved' ? RecoveryApprovalStatus.APPROVED : RecoveryApprovalStatus.REJECTED;
    approval.decidedAt = new Date();
    approval.signature = dto.signature;
    await this.recoveryApprovalRepository.save(approval);

    await this.systemService.recordAudit(`recovery.approval.${approval.status}`, undefined, {
      recoveryRequestId: requestId,
      guardianId: guardian.id,
    });

    if (decision === 'rejected') {
      // MVP policy: a single rejection blocks the request outright, rather than just
      // reducing the achievable approval count - the safer default until a
      // configurable threshold policy exists (see requiredApprovals note above).
      request.status = RecoveryRequestStatus.REJECTED;
      await this.recoveryRequestRepository.save(request);
      await this.systemService.recordAudit('recovery.failed', undefined, {
        recoveryRequestId: requestId,
        reason: 'guardian rejected',
        guardianId: guardian.id,
      });
      return request;
    }

    const approvedCount = await this.recoveryApprovalRepository.countApprovedForRequest(requestId);
    if (approvedCount >= request.requiredApprovals) {
      request.status = RecoveryRequestStatus.APPROVED;
      await this.recoveryRequestRepository.save(request);
      await this.systemService.recordAudit('recovery.approved', undefined, {
        recoveryRequestId: requestId,
      });
    }

    return request;
  }

  async listHistoryForWallet(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResultDto<RecoveryRequestEntity>> {
    const wallet = await this.walletService.getByUserId(userId);
    const { skip, take } = toSkipTake(query);
    const [items, total] = await this.recoveryRequestRepository.findHistoryForWallet(
      wallet.id,
      skip,
      take,
    );

    return new PaginatedResultDto(
      items,
      total,
      query.page ?? DEFAULT_PAGE,
      query.limit ?? DEFAULT_PAGE_SIZE,
    );
  }

  // Executes an approved recovery on-chain using Safe's official SocialRecoveryModule.
  // This backend acts purely as a gas-sponsoring relayer: it collects the guardian
  // EIP-712 signatures already gathered off-chain during submitApproval() and submits
  // them in one multiConfirmRecovery() batch call - it never signs on a guardian's or
  // the user's behalf, and the module verifies every signature on-chain before acting on
  // it. See docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1 for the one remaining open item
  // (that module's deployment does not currently cover Base).
  async executeRecovery(userId: string, requestId: string): Promise<RecoveryRequestEntity> {
    const wallet = await this.walletService.getByUserId(userId);
    const request = await this.getById(requestId);

    if (request.walletId !== wallet.id) {
      throw new ForbiddenException('Not authorized for this recovery request');
    }
    if (request.status !== RecoveryRequestStatus.APPROVED) {
      throw new ConflictException(`Recovery request is ${request.status}, not ready for execution`);
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      request.status = RecoveryRequestStatus.EXPIRED;
      await this.recoveryRequestRepository.save(request);
      await this.systemService.recordAudit('recovery.expired', userId, {
        recoveryRequestId: requestId,
      });
      throw new ConflictException('This recovery request has expired');
    }
    if (!wallet.smartAccountAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }
    if (!request.recoveryHash) {
      throw new ConflictException(
        'The SocialRecoveryModule is not enabled on this wallet - complete the guardian ' +
          'module setup (GET /guardian-recovery/guardians/module-setup) before execution',
      );
    }

    // Only approvals carrying both a guardian on-chain address and an off-chain
    // signature can be used for the on-chain call - guardians who approved before
    // linking a wallet address are counted toward the off-chain threshold but cannot
    // themselves be verified by the module. Prevents both duplicate approvals (unique
    // DB index on recovery_approvals(recoveryRequestId, guardianId), already enforced in
    // submitApproval) and replay (each signature covers this request's specific
    // recoveryHash, itself derived from the module's own on-chain nonce).
    const approvals = await this.recoveryApprovalRepository.findApprovedForRequest(requestId);
    const signatures: IGuardianSignature[] = approvals
      .filter((approval) => approval.guardian?.guardianAddress && approval.signature)
      .map((approval) => ({
        signer: approval.guardian.guardianAddress as Address,
        signature: approval.signature as `0x${string}`,
      }))
      // Ascending signer-address order, the conventional signature-collection order for
      // Safe-ecosystem multisig verification.
      .sort((a, b) => a.signer.localeCompare(b.signer));

    if (signatures.length < request.requiredApprovals) {
      throw new ConflictException(
        `Execution requires an on-chain-verifiable signature from at least ` +
          `${request.requiredApprovals} guardian(s) with a registered wallet address - only ` +
          `${signatures.length} available`,
      );
    }

    try {
      const calldata = this.safeService.buildMultiConfirmRecoveryCallData(
        wallet.smartAccountAddress as Address,
        request.newOwnerAddress as Address,
        signatures,
      );
      const transactionHash = await this.relayerService.relayTransaction(
        this.safeService.getRecoveryModuleAddress(),
        calldata,
      );

      // Marks execution as complete once the relayer transaction is broadcast - mirrors
      // TransferService's submit-then-confirm pattern elsewhere in this codebase, not a
      // guarantee of on-chain finality. The module may also enforce its own execution
      // timelock (RecoveryRequest.executeAfter); this call passes execute=true so the
      // module performs the owner swap immediately whenever its own conditions already
      // allow it.
      request.status = RecoveryRequestStatus.EXECUTED;
      request.executedAt = new Date();
      request.executionTxHash = transactionHash;
      const saved = await this.recoveryRequestRepository.save(request);

      await this.systemService.recordAudit('recovery.executed', userId, {
        recoveryRequestId: requestId,
        transactionHash,
        guardianSignatureCount: signatures.length,
      });

      const user = await this.profileService.findByEmail(request.requestedByEmail);
      if (user) {
        await this.notificationService.notify(
          user.id,
          NotificationType.RECOVERY,
          'Recovery completed',
          `Your wallet recovery has been executed on-chain. Transaction: ${transactionHash}`,
        );
      }
      await this.sendgridService.sendRecoveryCompleted({
        to: request.requestedByEmail,
        transactionHash,
      });

      return saved;
    } catch (error) {
      request.failureReason = error instanceof Error ? error.message : 'Execution failed';
      await this.recoveryRequestRepository.save(request);
      await this.systemService.recordAudit('recovery.execution.failed', userId, {
        recoveryRequestId: requestId,
        reason: request.failureReason,
      });
      throw error;
    }
  }
}
