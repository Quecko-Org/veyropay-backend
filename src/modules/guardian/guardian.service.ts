import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { getAddress } from 'viem';
import { IAppConfig } from '@core/config/app.config';
import { SendgridService } from '@integrations/sendgrid/sendgrid.service';
import { SafeService } from '@integrations/safe/safe.service';
import { NotificationService } from '@modules/notification/notification.service';
import { ProfileService } from '@modules/profile/profile.service';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletService } from '@modules/wallet/wallet.service';
import { GuardianStatus, NotificationType, UserStatus } from '@shared/enums';
import { MAX_GUARDIANS } from './constants';
import { InviteGuardianDto } from './dto/invite-guardian.dto';
import {
  GuardianResponseDto,
  GuardianUserCardDto,
  toGuardianResponse,
  toUserCard,
} from './dto/guardian-response.dto';
import { GuardianOnChainRegistrationDto } from './dto/guardian-on-chain-registration.dto';
import { GuardianEntity } from './entities/guardian.entity';
import { GuardianRepository } from './repositories/guardian.repository';
import { resolveRequiredApprovals } from '@modules/recovery/dto/recovery-response.dto';

@Injectable()
export class GuardianService {
  constructor(
    private readonly guardianRepository: GuardianRepository,
    private readonly profileService: ProfileService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly sendgridService: SendgridService,
    private readonly safeService: SafeService,
    private readonly configService: ConfigService,
  ) {}

  async search(callerId: string, email: string): Promise<GuardianUserCardDto> {
    const caller = await this.profileService.getById(callerId);
    const normalized = email.trim().toLowerCase();

    if (this.emailsMatch(caller.email, normalized)) {
      throw new BadRequestException('You cannot add yourself as a guardian');
    }

    const user = await this.profileService.findByEmail(normalized);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No user found for this email');
    }

    const wallet = await this.walletService.findByUserId(user.id);
    return toUserCard(user, wallet);
  }

  async searchBySmartWalletAddress(
    callerId: string,
    address: string,
  ): Promise<GuardianUserCardDto> {
    const wallet = await this.walletService.findBySmartAccountAddress(address);
    if (!wallet) {
      throw new NotFoundException('No user found for this smart wallet address');
    }

    if (wallet.userId === callerId) {
      throw new BadRequestException('You cannot add yourself as a guardian');
    }

    let user: UserEntity;
    try {
      user = await this.profileService.getById(wallet.userId);
    } catch {
      throw new NotFoundException('No user found for this smart wallet address');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No user found for this smart wallet address');
    }

    return toUserCard(user, wallet);
  }

  async invite(callerId: string, dto: InviteGuardianDto): Promise<GuardianResponseDto> {
    const caller = await this.profileService.getById(callerId);
    const wallet = await this.walletService.getByUserId(callerId);
    const target = await this.requireActiveUser(dto.userId);

    if (!target.email) {
      throw new BadRequestException('This user does not have an email address');
    }

    if (target.id === callerId || this.emailsMatch(caller.email, target.email)) {
      throw new BadRequestException('You cannot add yourself as a guardian');
    }

    const email = target.email.trim().toLowerCase();
    const openCount = await this.guardianRepository.countOpenForWallet(wallet.id);
    if (openCount >= MAX_GUARDIANS) {
      throw new ConflictException('You can add up to 3 guardians');
    }

    const duplicate =
      (await this.guardianRepository.findOpenByWalletAndEmail(wallet.id, email)) ??
      (await this.guardianRepository.findOpenByWalletAndUserId(wallet.id, target.id));
    if (duplicate) {
      throw new ConflictException('This user is already a guardian or has a pending invitation');
    }

    const entity = this.guardianRepository.create({
      walletId: wallet.id,
      guardianEmail: email,
      guardianName: target.displayName,
      guardianUserId: target.id,
      status: GuardianStatus.INVITED,
      relationship: dto.relationship,
      canApproveRecovery: dto.canApproveRecovery ?? true,
      canMoveFunds: dto.canMoveFunds ?? false,
      canSeeBalance: dto.canSeeBalance ?? false,
      canBeRemoved: dto.canBeRemoved ?? true,
      invitationToken: randomUUID(),
      invitedAt: new Date(),
    });

    const saved = await this.guardianRepository.save(entity);
    saved.guardianUser = target;
    saved.wallet = { ...wallet, user: caller };

    await this.notificationService.notify(
      target.id,
      NotificationType.RECOVERY,
      'Guardian invitation',
      `${caller.displayName ?? caller.email ?? 'A user'} invited you to be a recovery guardian.`,
    );

    await this.sendgridService.sendGuardianInvitation({
      to: email,
      toName: target.displayName,
      inviterEmail: caller.email ?? '',
      invitationUrl: this.invitationUrl(),
    });

    const targetWallet = await this.walletService.findByUserId(target.id);
    return toGuardianResponse(saved, targetWallet);
  }

  async listOutgoing(callerId: string): Promise<GuardianResponseDto[]> {
    const wallet = await this.walletService.getByUserId(callerId);
    const rows = await this.guardianRepository.findOutgoingForWallet(wallet.id);
    return this.toGuardianResponses(rows);
  }

  async listIncoming(callerId: string): Promise<GuardianResponseDto[]> {
    const caller = await this.profileService.getById(callerId);
    const rows = await this.guardianRepository.findIncomingForUser(callerId, caller.email);
    return this.toGuardianResponses(rows);
  }

  async accept(callerId: string, id: string): Promise<GuardianResponseDto> {
    const guardian = await this.requireIncomingInvite(callerId, id);
    const inviteeWallet = await this.walletService.findByUserId(callerId);

    if (!inviteeWallet?.ownerAddress) {
      throw new ConflictException(
        'Provision your Turnkey smart account before accepting a guardian invitation',
      );
    }

    guardian.status = GuardianStatus.ACTIVE;
    guardian.verifiedAt = new Date();
    guardian.guardianAddress = inviteeWallet.ownerAddress;

    const saved = await this.guardianRepository.save(guardian);
    await this.notifyOwner(
      guardian,
      'Guardian invitation accepted',
      `${guardian.guardianName ?? guardian.guardianEmail} accepted your guardian invitation. ` +
        'Register them on-chain via GET /guardian/:id/on-chain-registration.',
    );

    return toGuardianResponse(saved, inviteeWallet);
  }

  async getOnChainRegistration(
    callerId: string,
    id: string,
  ): Promise<GuardianOnChainRegistrationDto> {
    const guardian = await this.requireOwnedGuardian(callerId, id);
    if (guardian.status !== GuardianStatus.ACTIVE) {
      throw new ConflictException('Only an accepted guardian can be registered on-chain');
    }
    if (!guardian.guardianAddress) {
      throw new ConflictException('Guardian has no signer address');
    }

    const wallet = await this.walletService.getByUserId(callerId);
    if (!wallet.smartAccountAddress) {
      throw new ConflictException('Smart account has not been provisioned yet');
    }

    const safeAddress = getAddress(wallet.smartAccountAddress);
    const guardianAddress = getAddress(guardian.guardianAddress);
    const active = await this.guardianRepository.findActiveApproversForWallet(wallet.id);
    const threshold = resolveRequiredApprovals(active.length, wallet.guardianThreshold);

    let moduleEnabled = false;
    try {
      moduleEnabled = await this.safeService.isRecoveryModuleEnabled(safeAddress);
    } catch {
      moduleEnabled = false;
    }

    const moduleAddress = this.safeService.getRecoveryModuleAddress();
    const addGuardianData = this.safeService.buildAddGuardianCallData(guardianAddress, threshold);

    const result = new GuardianOnChainRegistrationDto({
      guardianId: guardian.id,
      safeAddress,
      guardianAddress,
      recoveryModuleAddress: moduleAddress,
      threshold,
      moduleEnabled,
      addGuardian: {
        to: moduleAddress,
        value: '0',
        data: addGuardianData,
      },
    });

    if (!moduleEnabled) {
      const enableTx = await this.safeService.buildEnableRecoveryModuleTransaction(safeAddress);
      result.enableModule = {
        to: enableTx.to,
        value: enableTx.value.toString(),
        data: enableTx.data,
      };
    }

    return result;
  }

  async decline(callerId: string, id: string): Promise<GuardianResponseDto> {
    const guardian = await this.requireIncomingInvite(callerId, id);
    guardian.status = GuardianStatus.REJECTED;
    const saved = await this.guardianRepository.save(guardian);

    await this.notifyOwner(
      guardian,
      'Guardian invitation declined',
      `${guardian.guardianName ?? guardian.guardianEmail} declined your guardian invitation.`,
    );

    return this.toGuardianResponseWithWallet(saved);
  }

  async remove(callerId: string, id: string): Promise<GuardianResponseDto> {
    const guardian = await this.requireOwnedGuardian(callerId, id);

    if (guardian.status === GuardianStatus.REMOVED) {
      throw new ConflictException('This guardian has already been removed');
    }

    if (guardian.status === GuardianStatus.ACTIVE && !guardian.canBeRemoved) {
      throw new ForbiddenException('This guardian cannot be removed');
    }

    guardian.status = GuardianStatus.REMOVED;
    guardian.removedAt = new Date();
    const saved = await this.guardianRepository.save(guardian);
    return this.toGuardianResponseWithWallet(saved);
  }

  private async toGuardianResponses(rows: GuardianEntity[]): Promise<GuardianResponseDto[]> {
    const userIds = [
      ...new Set(
        rows
          .map((row) => row.guardianUserId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];
    const wallets = await this.walletService.findByUserIds(userIds);
    const walletsByUserId = new Map(wallets.map((wallet) => [wallet.userId, wallet]));

    return rows.map((row) =>
      toGuardianResponse(
        row,
        row.guardianUserId ? (walletsByUserId.get(row.guardianUserId) ?? null) : null,
      ),
    );
  }

  private async toGuardianResponseWithWallet(
    entity: GuardianEntity,
  ): Promise<GuardianResponseDto> {
    const guardianWallet = entity.guardianUserId
      ? await this.walletService.findByUserId(entity.guardianUserId)
      : null;
    return toGuardianResponse(entity, guardianWallet);
  }

  private async requireActiveUser(userId: string): Promise<UserEntity> {
    const user = await this.profileService.getById(userId);
    if (user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('No user found for this email');
    }
    return user;
  }

  private async requireIncomingInvite(callerId: string, id: string): Promise<GuardianEntity> {
    const caller = await this.profileService.getById(callerId);
    const guardian = await this.guardianRepository.findByIdWithRelations(id);
    if (!guardian || !this.isInvitee(guardian, caller)) {
      throw new NotFoundException('Guardian invitation not found');
    }
    if (guardian.status !== GuardianStatus.INVITED) {
      throw new ConflictException('This invitation has already been responded to');
    }
    return guardian;
  }

  private async requireOwnedGuardian(callerId: string, id: string): Promise<GuardianEntity> {
    const wallet = await this.walletService.getByUserId(callerId);
    const guardian = await this.guardianRepository.findByIdWithRelations(id);
    if (!guardian || guardian.walletId !== wallet.id) {
      throw new NotFoundException('Guardian not found');
    }
    return guardian;
  }

  private isInvitee(guardian: GuardianEntity, caller: UserEntity): boolean {
    if (guardian.guardianUserId && guardian.guardianUserId === caller.id) {
      return true;
    }
    return this.emailsMatch(caller.email, guardian.guardianEmail);
  }

  private emailsMatch(left: string | undefined, right: string | undefined): boolean {
    if (!left || !right) {
      return false;
    }
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  private invitationUrl(): string {
    const app = this.configService.get<IAppConfig>('app') as IAppConfig;
    const origin =
      app.corsOrigin && app.corsOrigin !== '*' ? app.corsOrigin.replace(/\/$/, '') : '';
    return origin ? `${origin}/guardians/incoming` : '/guardians/incoming';
  }

  private async notifyOwner(guardian: GuardianEntity, title: string, body: string): Promise<void> {
    const ownerId = guardian.wallet?.userId;
    if (!ownerId) {
      return;
    }
    await this.notificationService.notify(ownerId, NotificationType.RECOVERY, title, body);
  }
}
