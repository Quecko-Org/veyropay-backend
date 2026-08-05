import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupResultDto {
  @ApiProperty({ description: 'New Turnkey sub-organization ID for this user' })
  subOrganizationId!: string;

  @ApiPropertyOptional({ description: 'First Ethereum address provisioned for the new wallet' })
  walletAddress?: string;

  constructor(partial: SignupResultDto) {
    Object.assign(this, partial);
  }
}
