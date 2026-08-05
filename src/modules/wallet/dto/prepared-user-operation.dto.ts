import { ApiProperty } from '@nestjs/swagger';

// Unsigned ERC-4337 UserOperation (EntryPoint v0.7 shape) ready for the client to
// sign locally via Turnkey and submit back through POST /transfer. The backend
// never signs this - it only fills in the fields that require chain/provider state
// (nonce, initCode, gas estimates) that the client has no way to compute itself.
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

  @ApiProperty()
  paymasterAndData!: string;

  @ApiProperty()
  entryPoint!: string;

  constructor(partial: PreparedUserOperationDto) {
    Object.assign(this, partial);
  }
}
