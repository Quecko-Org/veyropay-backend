
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
export class PreviewSwapDto {
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

  @ApiProperty({ description: 'Wallet address quoting the swap' })
  @IsString()
  @IsNotEmpty()
  fromAddress!: string;

  @ApiPropertyOptional({
    description:
      'Max acceptable slippage percent for a same-chain (1inch) swap, e.g. 1 for 1%. Defaults to 1.',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  slippage?: number;

}
