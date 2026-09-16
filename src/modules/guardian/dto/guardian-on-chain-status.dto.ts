import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuardianOnChainStatusItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiProperty({
    enum: ['pending', 'approved', 'rejected'],
    description: 'App/DB invitation status',
  })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiProperty()
  canApproveRecovery!: boolean;

  @ApiPropertyOptional({ description: 'Guardian Turnkey EOA used on SocialRecoveryModule' })
  guardianAddress?: string;

  @ApiProperty({
    description: 'True when SocialRecoveryModule.isGuardian(safe, guardianAddress) is true',
  })
  onChainRegistered!: boolean;

  constructor(partial: GuardianOnChainStatusItemDto) {
    Object.assign(this, partial);
  }
}

export class GuardianOnChainStatusDto {
  @ApiPropertyOptional()
  safeAddress?: string;

  @ApiProperty()
  safeDeployed!: boolean;

  @ApiProperty()
  moduleEnabled!: boolean;

  @ApiProperty({ description: 'Accepted guardians with canApproveRecovery in the app/DB' })
  approvedInApp!: number;

  @ApiProperty({ description: 'Those same guardians currently registered on-chain' })
  registeredOnChain!: number;

  @ApiProperty({
    description:
      'True when every approved recovery guardian is on-chain (recovery create can proceed)',
  })
  readyForRecovery!: boolean;

  @ApiProperty({ type: [GuardianOnChainStatusItemDto] })
  guardians!: GuardianOnChainStatusItemDto[];

  constructor(partial: GuardianOnChainStatusDto) {
    Object.assign(this, partial);
  }
}
