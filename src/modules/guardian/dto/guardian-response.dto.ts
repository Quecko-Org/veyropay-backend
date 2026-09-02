import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationship, GuardianStatus, WalletStatus } from '@shared/enums';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { WalletEntity } from '@modules/wallet/entities/wallet.entity';
import { GuardianEntity } from '../entities/guardian.entity';

export class GuardianWalletCardDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  smartAccountAddress?: string;

  @ApiProperty()
  chainId!: number;

  @ApiProperty({ enum: WalletStatus })
  status!: WalletStatus;

  constructor(partial: GuardianWalletCardDto) {
    Object.assign(this, partial);
  }
}

export class GuardianUserCardDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional({ type: GuardianWalletCardDto, nullable: true })
  wallet?: GuardianWalletCardDto | null;

  constructor(partial: GuardianUserCardDto) {
    Object.assign(this, partial);
  }
}

export class GuardianResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ enum: GuardianRelationship })
  relationship?: GuardianRelationship;

  @ApiProperty()
  canApproveRecovery!: boolean;

  @ApiProperty()
  canMoveFunds!: boolean;

  @ApiProperty()
  canSeeBalance!: boolean;

  @ApiProperty()
  canBeRemoved!: boolean;

  @ApiPropertyOptional({ type: GuardianUserCardDto })
  guardian?: GuardianUserCardDto;

  @ApiPropertyOptional({ type: GuardianUserCardDto })
  owner?: GuardianUserCardDto;

  @ApiProperty()
  invitedAt!: Date;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  constructor(partial: GuardianResponseDto) {
    Object.assign(this, partial);
  }
}

export function toWalletCard(wallet: WalletEntity): GuardianWalletCardDto {
  return new GuardianWalletCardDto({
    id: wallet.id,
    smartAccountAddress: wallet.smartAccountAddress,
    chainId: wallet.chainId,
    status: wallet.status,
  });
}

export function toUserCard(user: UserEntity, wallet?: WalletEntity | null): GuardianUserCardDto {
  return new GuardianUserCardDto({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    wallet: wallet ? toWalletCard(wallet) : null,
  });
}

export function toClientStatus(status: GuardianEntity['status']): GuardianResponseDto['status'] {
  if (status === GuardianStatus.INVITED) {
    return 'pending';
  }
  if (status === GuardianStatus.ACTIVE) {
    return 'approved';
  }
  return 'rejected';
}

export function toGuardianResponse(entity: GuardianEntity): GuardianResponseDto {
  const guardianUser = entity.guardianUser;
  const ownerUser = entity.wallet?.user;

  return new GuardianResponseDto({
    id: entity.id,
    status: toClientStatus(entity.status),
    relationship: entity.relationship,
    canApproveRecovery: entity.canApproveRecovery,
    canMoveFunds: entity.canMoveFunds,
    canSeeBalance: entity.canSeeBalance,
    canBeRemoved: entity.canBeRemoved,
    guardian: guardianUser
      ? toUserCard(guardianUser)
      : new GuardianUserCardDto({
          id: entity.guardianUserId ?? entity.id,
          email: entity.guardianEmail,
          displayName: entity.guardianName,
          wallet: null,
        }),
    owner: ownerUser ? toUserCard(ownerUser) : undefined,
    invitedAt: entity.invitedAt,
    verifiedAt: entity.verifiedAt,
    createdAt: entity.createdAt,
  });
}
