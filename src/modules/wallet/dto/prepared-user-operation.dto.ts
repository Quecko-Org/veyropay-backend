import { ApiProperty,ApiPropertyOptional } from '@nestjs/swagger';

export class PreparedUserOperationDto {
  @ApiProperty()
  sender!: string;

  @ApiProperty()
  nonce!: string;

   // EntryPoint v0.7 shape - separate factory/factoryData fields, not a single combined
  // initCode blob (that's the v0.6 shape). Both undefined/absent when the smart account
  // is already deployed on-chain.
  @ApiPropertyOptional({ description: 'Deployment factory address - absent if already deployed' })
  factory?: string;

  @ApiPropertyOptional({ description: 'Deployment factory calldata - absent if already deployed' })
  factoryData?: string;

  @ApiProperty()
  callData!: string;

  @ApiProperty()
  callGasLimit!: string;

  @ApiProperty()
  verificationGasLimit!: string;

  @ApiProperty()
  preVerificationGas!: string;

  @ApiProperty()
  maxFeePerGas!: string;

  @ApiProperty()
  maxPriorityFeePerGas!: string;

  @ApiProperty({ description: '0x if unsponsored' })
  paymaster!: string;

  @ApiProperty({ description: '0x if unsponsored' })
  paymasterData!: string;

  @ApiProperty()
  paymasterVerificationGasLimit!: string;

  @ApiProperty()
  paymasterPostOpGasLimit!: string;

  @ApiProperty()
  entryPoint!: string;

  constructor(partial: PreparedUserOperationDto) {
    Object.assign(this, partial);
  }
}