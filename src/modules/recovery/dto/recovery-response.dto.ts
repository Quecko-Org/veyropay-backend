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

export enum RecoveryNextStep {
  COLLECT_APPROVALS = 'collect_approvals',
  EXECUTE_CONFIRM = 'execute_confirm',
  AWAIT_GRACE_PERIOD = 'await_grace_period',
  EXECUTE_FINALIZE = 'execute_finalize',
  CLAIM = 'claim',
  NONE = 'none',
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

  @ApiPropertyOptional({
    description: 'On-chain SocialRecoveryModule hash guardians must sign (EIP-712 digest)',
  })
  recoveryHash?: string;

  @ApiPropertyOptional({ description: 'Module nonce used when recoveryHash was computed' })
  recoveryNonce?: string;

  @ApiPropertyOptional({
    description: 'EIP-712 typed data for guardian Turnkey / wallet signTypedData',
  })
  typedData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'On-chain multiConfirmRecovery transaction hash (starts grace period)',
  })
  confirmTxHash?: string | null;

  @ApiPropertyOptional({
    description: 'On-chain finalizeRecovery transaction hash (owner swap)',
  })
  executionTxHash?: string;

  @ApiPropertyOptional({
    description: 'Set when POST .../claim succeeds and status becomes claimed',
  })
  claimedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Present when on-chain multiConfirmRecovery relay failed (status stays approved)',
  })
  failureReason?: string | null;

  @ApiPropertyOptional({
    description:
      'When set, SocialRecoveryModule grace period ends at this time - call POST .../execute again after to finalizeRecovery (owner swap)',
  })
  finalizeAfter?: Date | null;

  @ApiProperty({
    description: 'True when status is executed and POST .../claim is allowed',
  })
  canClaim!: boolean;

  @ApiProperty({
    description:
      'True when grace period has ended and POST .../execute will relay finalizeRecovery',
  })
  canFinalize!: boolean;

  @ApiPropertyOptional({
    description:
      'Earliest time claim becomes available (grace period end). Null when canClaim is true now.',
  })
  claimAvailableAfter?: Date | null;

  @ApiProperty({ enum: RecoveryNextStep, description: 'Suggested client action for mobile UX' })
  nextStep!: RecoveryNextStep;

  @ApiProperty({
    description: 'Human-readable hint for the current recovery stage',
  })
  message!: string;

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
    recoveryHash?: string;
    recoveryNonce?: string;
    typedData?: Record<string, unknown>;
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

  @ApiPropertyOptional()
  executionTxHash?: string;

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

export function resolveRecoveryClientHints(entity: RecoveryRequestEntity): {
  canClaim: boolean;
  canFinalize: boolean;
  claimAvailableAfter: Date | null;
  nextStep: RecoveryNextStep;
  message: string;
} {
  const now = Date.now();
  const finalizeAfterMs = entity.finalizeAfter?.getTime();

  if (entity.status === RecoveryRequestStatus.CLAIMED) {
    return {
      canClaim: false,
      canFinalize: false,
      claimAvailableAfter: null,
      nextStep: RecoveryNextStep.NONE,
      message: 'Recovery completed and claimed.',
    };
  }

  if (entity.status === RecoveryRequestStatus.EXECUTED && entity.executionTxHash) {
    return {
      canClaim: true,
      canFinalize: false,
      claimAvailableAfter: null,
      nextStep: RecoveryNextStep.CLAIM,
      message:
        'Recovery finalized on-chain. Sign in with your new passkey, then call POST .../claim.',
    };
  }

  if (entity.status === RecoveryRequestStatus.APPROVED) {
    if (finalizeAfterMs && finalizeAfterMs > now) {
      return {
        canClaim: false,
        canFinalize: false,
        claimAvailableAfter: entity.finalizeAfter ?? null,
        nextStep: RecoveryNextStep.AWAIT_GRACE_PERIOD,
        message:
          `Grace period active until ${entity.finalizeAfter!.toISOString()}. ` +
          'Call execute again after that time to finalize, then claim.',
      };
    }

    if (finalizeAfterMs && finalizeAfterMs <= now) {
      return {
        canClaim: false,
        canFinalize: true,
        claimAvailableAfter: entity.finalizeAfter ?? null,
        nextStep: RecoveryNextStep.EXECUTE_FINALIZE,
        message:
          'Grace period ended. call execute to finalize the owner swap, then claim.',
      };
    }

    return {
      canClaim: false,
      canFinalize: false,
      claimAvailableAfter: null,
      nextStep: RecoveryNextStep.EXECUTE_CONFIRM,
      message: 'Guardians approved. Call POST .../execute to start on-chain confirmation.',
    };
  }

  if (entity.status === RecoveryRequestStatus.PENDING) {
    return {
      canClaim: false,
      canFinalize: false,
      claimAvailableAfter: null,
      nextStep: RecoveryNextStep.COLLECT_APPROVALS,
      message: 'Waiting for guardian approvals.',
    };
  }

  return {
    canClaim: false,
    canFinalize: false,
    claimAvailableAfter: null,
    nextStep: RecoveryNextStep.NONE,
    message: '',
  };
}

export function toRecoveryRequestDto(
  entity: RecoveryRequestEntity,
  typedData?: Record<string, unknown>,
): RecoveryRequestDto {
  const approvals = entity.approvals ?? [];
  const guardiansCanMoveFunds = approvals.some((row) => row.guardian?.canMoveFunds === true);
  const hints = resolveRecoveryClientHints(entity);

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
    recoveryHash: entity.recoveryHash,
    recoveryNonce: entity.recoveryNonce,
    typedData,
    confirmTxHash: entity.confirmTxHash ?? null,
    executionTxHash: entity.executionTxHash,
    claimedAt: entity.claimedAt ?? null,
    failureReason: entity.failureReason,
    finalizeAfter: entity.finalizeAfter,
    canClaim: hints.canClaim,
    canFinalize: hints.canFinalize,
    claimAvailableAfter: hints.claimAvailableAfter,
    nextStep: hints.nextStep,
    message: hints.message,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
  });
}

export function toIncomingItem(
  approval: RecoveryApprovalEntity,
  typedData?: Record<string, unknown>,
): IncomingRecoveryItemDto {
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
      recoveryHash: request.recoveryHash,
      recoveryNonce: request.recoveryNonce,
      typedData,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    },
  });
}
