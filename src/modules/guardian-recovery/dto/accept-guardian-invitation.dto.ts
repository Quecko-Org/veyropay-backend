import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class AcceptGuardianInvitationDto {
  @ApiPropertyOptional({
    description:
      'The guardian own EVM address (an EOA they control) - required before this guardian ' +
      'can produce an on-chain-verifiable recovery approval signature. Can be supplied later ' +
      'by re-accepting is not supported; set it here at acceptance time.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'guardianAddress must be a valid EVM address' })
  guardianAddress?: string;
}
