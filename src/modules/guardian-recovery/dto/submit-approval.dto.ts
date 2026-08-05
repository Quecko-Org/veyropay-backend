import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitApprovalDto {
  @ApiPropertyOptional({
    description:
      'Off-chain attestation of the guardian decision. Format is unspecified pending the ' +
      'on-chain execution design - see docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1.',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
