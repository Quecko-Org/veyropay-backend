import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class ExecuteUserOperationDto {
  @ApiProperty({
    description:
      'Already-signed ERC-4337 UserOperation produced client-side, for a generic ' +
      'utility call (e.g. an ERC20 approve()) that is not itself a transfer or swap - ' +
      'those go through /transfer and /swap instead. The backend never signs on the ' +
      "user's behalf.",
  })
  @IsObject()
  @IsNotEmpty()
  signedUserOperation!: Record<string, unknown>;
}