import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
