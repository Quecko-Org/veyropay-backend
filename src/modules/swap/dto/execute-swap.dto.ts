import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class ExecuteSwapDto {
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

  @ApiProperty({
    description:
      'Already-signed ERC-4337 UserOperation for the swap transaction, produced client-side.',
  })
  @IsObject()
  @IsNotEmpty()
  signedUserOperation!: Record<string, unknown>;
}
