import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address } from 'viem';
import { randomBytes } from 'crypto';
import { GuardianStatus, NotificationType } from '@shared/enums';
import { WalletService } from '@modules/wallet/wallet.service';
import { ProfileService } from '@modules/profile/profile.service';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { SafeService } from '@integrations/safe/safe.service';
import { PimlicoService } from '@integrations/pimlico/pimlico.service';
import { SendgridService } from '@integrations/sendgrid/sendgrid.service';
import { GuardianRepository } from '../repositories/guardian.repository';
import { GuardianEntity } from '../entities/guardian.entity';
import { AddGuardianDto } from '../dto/add-guardian.dto';
import { AcceptGuardianInvitationDto } from '../dto/accept-guardian-invitation.dto';
import { SetGuardianThresholdDto } from '../dto/set-guardian-threshold.dto';
import { MAX_GUARDIANS_PER_WALLET } from '../constants/guardian-recovery.constant';
import {
  IRecoveryModuleSetupStep,
  IRecoveryModuleSetupPlan,
} from '../interfaces/recovery-module-setup.interface';

// Guardian records are off-chain, wallet-scoped metadata only by themselves - a guardian
// only gains real on-chain recovery authority once it is registered with the
// SocialRecoveryModule via the calldata this service builds in
// getRecoveryModuleSetupCalldata() (executed by the wallet owner, through the existing
// generic UserOperation flow - see docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1).
@Injectable()
export class GuardianService {
  constructor(
    private readonly guardianRepository: GuardianRepository,
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
    private readonly notificationService: NotificationService,
    private readonly systemService: SystemService,
    private readonly safeService: SafeService,
    private readonly pimlicoService: PimlicoService,
    private readonly sendgridService: SendgridService,
  ) {}

  async addGuardian(userId: string, dto: AddGuardianDto): Promise<GuardianEntity> {
    const wallet = await this.walletService.getByUserId(userId);
    const owner = await this.profileService.getById(userId);

    const existing = await this.guardianRepository.findActiveOrInvitedByEmail(
      wallet.id,
      dto.guardianEmail,
    );
    if (existing) {
      throw new ConflictException('This email is already a guardian (or has a pending invitation)');
    }

    const activeCount = await this.guardianRepository.countActiveByWalletId(wallet.id);
    if (activeCount >= MAX_GUARDIANS_PER_WALLET) {
      throw new ConflictException(
        `A wallet may have at most ${MAX_GUARDIANS_PER_WALLET} guardians`,
      );
    }

    const guardianUser = await this.profileService.findByEmail(dto.guardianEmail);

    const guardian = this.guardianRepository.create({
      walletId: wallet.id,
      guardianEmail: dto.guardianEmail,
      guardianName: dto.guardianName,
      guardianUserId: guardianUser?.id,
      status: GuardianStatus.INVITED,
      invitationToken: randomBytes(32).toString('hex'),
      invitedAt: new Date(),
    });
    const saved = await this.guardianRepository.save(guardian);

    if (guardianUser) {
      await this.notificationService.notify(
        guardianUser.id,
        NotificationType.RECOVERY,
        'Guardian invitation',
        `You've been invited to be a recovery guardian for another wallet.`,
      );
    }

    await this.sendgridService.sendGuardianInvitation({
      to: dto.guardianEmail,
      toName: dto.guardianName,
      inviterEmail: owner?.email ?? 'A Nero Bank user',
      invitationUrl: `/guardian-recovery/guardians/accept/${saved.invitationToken}`,
    });

    await this.systemService.recordAudit('guardian.invited', userId, {
      guardianId: saved.id,
      guardianEmail: dto.guardianEmail,
    });

    return saved;
  }

  // Configurable N-of-M threshold, replacing the "every active guardian must approve"
  // MVP policy. Bound-checked here (write time) and re-checked at recovery-request
  // creation time (read time), since guardians can be removed afterwards.
  async setGuardianThreshold(userId: string, dto: SetGuardianThresholdDto): Promise<void> {
    const wallet = await this.walletService.getByUserId(userId);
    const activeCount = await this.guardianRepository.countActiveByWalletId(wallet.id);

    await this.walletService.setGuardianThreshold(userId, dto.threshold, activeCount);

    await this.systemService.recordAudit('guardian.threshold.changed', userId, {
      walletId: wallet.id,
      threshold: dto.threshold,
    });
  }

  // Additive, opt-in on-chain setup - does NOT touch Phase 3's Safe deployment/address
  // prediction. Returns unsigned calldata steps; the client signs each one via Turnkey
  // and submits it through the existing generic POST /wallet/prepare + submit flow, one
  // UserOperation per step (this backend's Safe setup only ever enables a single module
  // directly, no MultiSend batching - see safe-account.util.ts).
  async getRecoveryModuleSetupCalldata(userId: string): Promise<IRecoveryModuleSetupPlan> {
    const wallet = await this.walletService.getByUserId(userId);
    if (!wallet.smartAccountAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    // Protocol Kit's transaction builders (createEnableModuleTx, etc) read current
    // on-chain module state, so the Safe must already be deployed - it cannot encode
    // this step for a still-counterfactual Safe.
    const deployed = await this.pimlicoService.isContractDeployed(
      wallet.smartAccountAddress as Address,
    );
    if (!deployed) {
      throw new ConflictException(
        'This Safe has not been deployed on-chain yet - submit at least one transaction ' +
          'first, then retry module setup',
      );
    }

    const guardians = await this.guardianRepository.findActiveByWalletId(wallet.id);
    const guardiansWithAddress = guardians.filter((guardian) => guardian.guardianAddress);
    const threshold = wallet.guardianThreshold ?? (guardiansWithAddress.length || 1);

    const enableModuleTx = await this.safeService.buildEnableRecoveryModuleTransaction(
      wallet.smartAccountAddress as Address,
    );

    const steps: IRecoveryModuleSetupStep[] = [
      {
        to: enableModuleTx.to,
        data: enableModuleTx.data,
        description: 'Enable the SocialRecoveryModule on this Safe',
      },
      ...guardiansWithAddress.map((guardian) => ({
        to: wallet.smartAccountAddress as string,
        data: this.safeService.buildAddGuardianCallData(
          guardian.guardianAddress as Address,
          threshold,
        ),
        description: `Register guardian ${guardian.guardianEmail} (threshold ${threshold})`,
      })),
    ];

    return {
      safeAddress: wallet.smartAccountAddress,
      recoveryModuleAddress: this.safeService.getRecoveryModuleAddress(),
      steps,
    };
  }

  async listGuardians(userId: string): Promise<GuardianEntity[]> {
    const wallet = await this.walletService.getByUserId(userId);
    return this.guardianRepository.findByWalletId(wallet.id);
  }

  async removeGuardian(userId: string, guardianId: string): Promise<void> {
    const wallet = await this.walletService.getByUserId(userId);
    const guardian = await this.guardianRepository.findById(guardianId);

    if (!guardian || guardian.walletId !== wallet.id) {
      throw new NotFoundException('Guardian not found');
    }

    guardian.status = GuardianStatus.REMOVED;
    guardian.removedAt = new Date();
    await this.guardianRepository.save(guardian);

    await this.systemService.recordAudit('guardian.removed', userId, {
      guardianId: guardian.id,
      guardianEmail: guardian.guardianEmail,
    });
  }

  // Public (unauthenticated) - the invitation token itself is the credential proving
  // this is the invited guardian, the same trust model as the recovery-approval token.
  async acceptInvitation(
    invitationToken: string,
    dto?: AcceptGuardianInvitationDto,
  ): Promise<GuardianEntity> {
    const guardian = await this.guardianRepository.findByInvitationToken(invitationToken);

    if (!guardian || guardian.status === GuardianStatus.REMOVED) {
      throw new NotFoundException('Invitation not found');
    }
    if (guardian.status === GuardianStatus.ACTIVE) {
      throw new ForbiddenException('Invitation has already been accepted');
    }

    guardian.status = GuardianStatus.ACTIVE;
    guardian.verifiedAt = new Date();
    if (dto?.guardianAddress) {
      guardian.guardianAddress = dto.guardianAddress;
    }
    const saved = await this.guardianRepository.save(guardian);

    const wallet = await this.walletService.getById(guardian.walletId);
    await this.systemService.recordAudit('guardian.verified', wallet.userId, {
      guardianId: guardian.id,
      guardianEmail: guardian.guardianEmail,
    });

    return saved;
  }
}
