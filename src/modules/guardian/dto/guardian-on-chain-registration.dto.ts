import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuardianCallDataDto {
  @ApiProperty()
  to!: string;

  @ApiProperty({ description: 'Wei value as decimal string' })
  value!: string;

  @ApiProperty()
  data!: string;

  constructor(partial: GuardianCallDataDto) {
    Object.assign(this, partial);
  }
}

export class GuardianOnChainRegistrationDto {
  @ApiProperty()
  guardianId!: string;

  @ApiProperty()
  safeAddress!: string;

  @ApiProperty()
  guardianAddress!: string;

  @ApiProperty()
  recoveryModuleAddress!: string;

  @ApiProperty({
    description:
      'Threshold encoded into addGuardian (clamped so threshold <= on-chain guardians after add)',
  })
  threshold!: number;

  @ApiProperty()
  moduleEnabled!: boolean;

  @ApiProperty({
    description:
      'False for brand-new accounts (counterfactual Safe). prepare+execute of enableModule ' +
      'will deploy the Safe via factory fields, then enable the recovery module.',
  })
  safeDeployed!: boolean;

  @ApiPropertyOptional({
    type: GuardianCallDataDto,
    description:
      'Submit via POST /wallet/user-operations/prepare then execute (owner-signed). ' +
      'If safeDeployed is false, prepare attaches Safe factory deployment automatically.',
  })
  enableModule?: GuardianCallDataDto;

  @ApiProperty({
    type: GuardianCallDataDto,
    description: 'Call SocialRecoveryModule.addGuardianWithThreshold via Safe UserOp (to = module)',
  })
  addGuardian!: GuardianCallDataDto;

  constructor(partial: GuardianOnChainRegistrationDto) {
    Object.assign(this, partial);
  }
}
