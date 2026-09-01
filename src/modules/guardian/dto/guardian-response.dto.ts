import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationship, GuardianStatus } from '@shared/enums';
import { UserEntity } from '@modules/profile/entities/user.entity';
import { GuardianEntity } from '../entities/guardian.entity';

export class GuardianUserCardDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatar?: string;

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

export function toUserCard(user: UserEntity): GuardianUserCardDto {
  return new GuardianUserCardDto({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
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
        }),
    owner: ownerUser ? toUserCard(ownerUser) : undefined,
    invitedAt: entity.invitedAt,
    verifiedAt: entity.verifiedAt,
    createdAt: entity.createdAt,
  });
}
