import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class PrepareUserOperationDto {

  @ApiProperty({ description: 'Call target address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'to must be a valid EVM address' })
  to!: string;



  @ApiPropertyOptional({ description: 'Value to send, in wei (decimal string)', default: '0' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Call data, hex-encoded', default: '0x' })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]*$/, { message: 'data must be a valid hex string' })
  data?: string;

  @ApiPropertyOptional({
    description: 'ERC-20 token contract address. Required when checking token balance.',
  })
  @ApiPropertyOptional({
    description:
      'ERC20 token contract address, if this operation moves a token rather than native ETH',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'tokenAddress must be a valid EVM address' })
  tokenAddress?: string;

  // Deliberately separate from `value` (which is the native-ETH amount forwarded in
  // the call, not the token amount) and NOT derived by decoding `data` - `data` can be
  // an arbitrary router call (this endpoint is reused for swaps), not always a plain
  // ERC20 transfer(), so its shape can't be assumed. The client, which already knows
  // exactly what it's asking for, states the amount directly instead.
  @ApiPropertyOptional({
    description:
      'Amount of `tokenAddress` this operation is expected to spend from the wallet, ' +
      "in the token's smallest unit (decimal string). Required when tokenAddress is set.",
  })
  @IsOptional()
  @IsString()
  tokenAmount?: string;

}
