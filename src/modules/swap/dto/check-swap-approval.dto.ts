import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckSwapApprovalDto {
  @ApiProperty({ example: '8453', description: 'Numeric chain ID the token/allowance lives on' })
  @IsString()
  @IsNotEmpty()
  fromChain!: string;

  @ApiProperty({
    example: '8453',
    description: 'Numeric chain ID (same as fromChain for a same-chain swap)',
  })
  @IsString()
  @IsNotEmpty()
  toChain!: string;

  @ApiProperty({ description: 'ERC20 token contract address being spent by the swap' })
  @IsString()
  @IsNotEmpty()
  tokenAddress!: string;

  @ApiProperty({ description: "The wallet's Safe address" })
  @IsString()
  @IsNotEmpty()
  ownerAddress!: string;

  @ApiProperty({ description: 'Amount that will be spent, in the token smallest unit' })
  @IsString()
  @IsNotEmpty()
  amount!: string;

  // Required only for a cross-chain (LiFi) check - take this from the earlier
  // /swap/preview response's estimate.approvalAddress. 1inch needs no equivalent -
  // it resolves its own router/spender internally.
  @ApiPropertyOptional({
    description:
      'Spender to approve - required for a cross-chain (LiFi) check, from the preview ' +
      "response's estimate.approvalAddress. Not needed for a same-chain (1inch) check.",
  })
  @IsOptional()
  @IsString()
  spenderAddress?: string;
}
