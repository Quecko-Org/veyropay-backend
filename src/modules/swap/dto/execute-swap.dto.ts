import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ExecuteSwapDto {
  // Numeric chain ID as a string, NOT a chain name - matches PreviewSwapDto's
  // fromChain/toChain convention (see that DTO's comment).
  @ApiProperty({ example: '8453', description: 'Numeric chain ID, e.g. 8453 for Base' })
  @IsString()
  @IsNotEmpty()
  fromChain!: string;

  @ApiProperty({ example: '8453', description: 'Numeric chain ID, e.g. 8453 for Base' })
  @IsString()
  @IsNotEmpty()
  toChain!: string;

  @ApiProperty({ example: 'ETH' })
  @IsString()
  @IsNotEmpty()
  fromAsset!: string;

  @ApiProperty({ example: 'USDC' })
  @IsString()
  @IsNotEmpty()
  toAsset!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount!: string;

  // The platform fee amount the client was quoted at preview time (from the preview
  // response's fee breakdown - feeCosts[].feeSplit.integratorFee for LiFi, or computed
  // from the 1inch quote's fee percentage), in the fee-collection token's smallest
  // unit. Recorded on the transaction for accounting/reporting - the fee itself is
  // still taken atomically by the router, this is purely a record of it, not a second
  // collection.
  @ApiPropertyOptional({
    description:
      'Platform fee amount quoted at preview time, in the fee token smallest unit - ' +
      'recorded for accounting, does not itself move any funds.',
  })
  @IsOptional()
  @IsString()
  fee?: string;

  // Expected amount to be received in the destination asset, quoted at preview time
  // (dstAmount for 1inch, estimate.toAmount for LiFi), in the destination token's
  // smallest unit. Recorded as the transaction's receivedAmount - for a same-chain
  // swap this quoted figure is the only value we ever get, but for a cross-chain
  // swap it's overwritten with LiFi's own reported actual amount once the bridge
  // transfer completes (see SwapService.finalizeOnceReceiptKnown).
  @ApiPropertyOptional({
    description: 'Expected destination-asset amount quoted at preview time, in its smallest unit.',
  })
  @IsOptional()
  @IsString()
  toAmount?: string;

  @ApiProperty({
    description:
      'Already-signed ERC-4337 UserOperation for the swap transaction, produced client-side.',
  })
  @IsObject()
  @IsNotEmpty()
  signedUserOperation!: Record<string, unknown>;
}