import { ApiProperty } from '@nestjs/swagger';

export class PreparedUserOperationDto {
  @ApiProperty()
  sender!: string;

  @ApiProperty()
  nonce!: string;

  @ApiProperty({ description: '0x if the smart account is already deployed on-chain' })
  initCode!: string;

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