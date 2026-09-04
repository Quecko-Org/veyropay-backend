import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GuardianRelationship,
  RecoveryApprovalStatus,
  RecoveryRequestStatus,
  WalletStatus,
} from '@shared/enums';
import { GuardianEntity } from '@modules/guardian/entities/guardian.entity';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { RecoveryApprovalEntity } from '../entities/recovery-approval.entity';
import { RecoveryRequestEntity } from '../entities/recovery-request.entity';

export class RecoveryWalletCardDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  smartAccountAddress?: string;

  @ApiProperty()
  chainId!: number;

  @ApiProperty({ enum: WalletStatus })
  status!: WalletStatus;

  constructor(partial: RecoveryWalletCardDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryOwnerCardDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  constructor(partial: RecoveryOwnerCardDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryGuardianSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional({ enum: GuardianRelationship })
  relationship?: GuardianRelationship;

  @ApiProperty()
  canApproveRecovery!: boolean;

  @ApiProperty()
  canMoveFunds!: boolean;

  constructor(partial: RecoveryGuardianSummaryDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryLookupDto {
  @ApiProperty({ type: RecoveryWalletCardDto })
  wallet!: RecoveryWalletCardDto;

  @ApiProperty({ type: RecoveryOwnerCardDto })
  owner!: RecoveryOwnerCardDto;

  @ApiProperty()
  guardiansRegistered!: number;

  @ApiProperty()
  approvalsNeeded!: number;

  @ApiProperty()
  guardiansCanMoveFunds!: boolean;

  @ApiProperty({ type: [RecoveryGuardianSummaryDto] })
  guardians!: RecoveryGuardianSummaryDto[];

  constructor(partial: RecoveryLookupDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryApprovalItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  guardianId!: string;

  @ApiPropertyOptional()
  guardianName?: string;

  @ApiProperty({ enum: RecoveryApprovalStatus })
  status!: RecoveryApprovalStatus;

  @ApiPropertyOptional()
  decidedAt?: Date | null;

  constructor(partial: RecoveryApprovalItemDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RecoveryRequestStatus })
  status!: RecoveryRequestStatus;

  @ApiProperty({ type: RecoveryWalletCardDto })
  wallet!: RecoveryWalletCardDto;

  @ApiProperty({ description: 'New signer address (UI: New signer)' })
  newOwnerAddress!: string;

  @ApiProperty()
  requiredApprovals!: number;

  @ApiProperty()
  approvalsCount!: number;

  @ApiProperty()
  guardiansRegistered!: number;

  @ApiProperty()
  guardiansCanMoveFunds!: boolean;

  @ApiProperty({ type: [RecoveryApprovalItemDto] })
  approvals!: RecoveryApprovalItemDto[];

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  constructor(partial: RecoveryRequestDto) {
    Object.assign(this, partial);
  }
}

export class IncomingRecoveryItemDto {
  @ApiProperty()
  approvalId!: string;

  @ApiProperty({ enum: RecoveryApprovalStatus })
  status!: RecoveryApprovalStatus;

  @ApiProperty()
  recoveryRequest!: {
    id: string;
    status: RecoveryRequestStatus;
    walletAddress?: string;
    newOwnerAddress: string;
    requiredApprovals: number;
    approvalsCount: number;
    ownerDisplayName?: string;
    createdAt: Date;
    expiresAt?: Date;
  };

  constructor(partial: IncomingRecoveryItemDto) {
    Object.assign(this, partial);
  }
}

export class RecoveryDecisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: RecoveryApprovalStatus })
  status!: RecoveryApprovalStatus;

  @ApiPropertyOptional()
  decidedAt?: Date;

  @ApiProperty()
  recoveryRequestId!: string;

  @ApiProperty()
  approvalsCount!: number;

  @ApiProperty()
  requiredApprovals!: number;

  @ApiProperty({ enum: RecoveryRequestStatus })
  recoveryStatus!: RecoveryRequestStatus;

  constructor(partial: RecoveryDecisionDto) {
    Object.assign(this, partial);
  }
}

export function maskEmail(email?: string): string | undefined {
  if (!email) {
    return undefined;
  }
  const [local, domain] = email.split('@');
  if (!domain || !local) {
    return email;
  }
  const visible = local.slice(0, 1) || '*';
  return `${visible}***@${domain}`;
}

export function toWalletCard(wallet: WalletEntity): RecoveryWalletCardDto {
  return new RecoveryWalletCardDto({
    id: wallet.id,
    smartAccountAddress: wallet.smartAccountAddress,
    chainId: wallet.chainId,
    status: wallet.status,
  });
}

export function toOwnerCard(user: UserEntity, mask = false): RecoveryOwnerCardDto {
  return new RecoveryOwnerCardDto({
    id: user.id,
    email: mask ? maskEmail(user.email) : user.email,
    displayName: user.displayName,
    avatar: user.avatar,
  });
}

export function toGuardianSummary(guardian: GuardianEntity): RecoveryGuardianSummaryDto {
  return new RecoveryGuardianSummaryDto({
    id: guardian.id,
    displayName: guardian.guardianName ?? guardian.guardianUser?.displayName,
    relationship: guardian.relationship,
    canApproveRecovery: guardian.canApproveRecovery,
    canMoveFunds: guardian.canMoveFunds,
  });
}

export function resolveRequiredApprovals(
  activeCount: number,
  guardianThreshold?: number | null,
): number {
  if (
    typeof guardianThreshold === 'number' &&
    guardianThreshold >= 1 &&
    guardianThreshold <= activeCount
  ) {
    return guardianThreshold;
  }
  return activeCount;
}

export function countApproved(approvals: RecoveryApprovalEntity[]): number {
  return approvals.filter((row) => row.status === RecoveryApprovalStatus.APPROVED).length;
}

export function toApprovalItem(approval: RecoveryApprovalEntity): RecoveryApprovalItemDto {
  return new RecoveryApprovalItemDto({
    id: approval.id,
    guardianId: approval.guardianId,
    guardianName:
      approval.guardian?.guardianName ??
      approval.guardian?.guardianUser?.displayName ??
      approval.guardian?.guardianEmail,
    status: approval.status,
    decidedAt: approval.decidedAt ?? null,
  });
}

export function toRecoveryRequestDto(entity: RecoveryRequestEntity): RecoveryRequestDto {
  const approvals = entity.approvals ?? [];
  const guardiansCanMoveFunds = approvals.some((row) => row.guardian?.canMoveFunds === true);

  return new RecoveryRequestDto({
    id: entity.id,
    status: entity.status,
    wallet: toWalletCard(entity.wallet),
    newOwnerAddress: entity.newOwnerAddress,
    requiredApprovals: entity.requiredApprovals,
    approvalsCount: countApproved(approvals),
    guardiansRegistered: approvals.length,
    guardiansCanMoveFunds,
    approvals: approvals.map(toApprovalItem),
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
  });
}

export function toIncomingItem(approval: RecoveryApprovalEntity): IncomingRecoveryItemDto {
  const request = approval.recoveryRequest;
  const approvals = request.approvals ?? [];

  return new IncomingRecoveryItemDto({
    approvalId: approval.id,
    status: approval.status,
    recoveryRequest: {
      id: request.id,
      status: request.status,
      walletAddress: request.wallet?.smartAccountAddress,
      newOwnerAddress: request.newOwnerAddress,
      requiredApprovals: request.requiredApprovals,
      approvalsCount: countApproved(approvals),
      ownerDisplayName: request.wallet?.user?.displayName,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    },
  });
}
