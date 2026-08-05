import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class InitiateTransferDto {
  @ApiProperty({ example: 'USDC' })
  @IsString()
  @IsNotEmpty()
  asset!: string;

  @ApiProperty({ example: 'base' })
  @IsString()
  @IsNotEmpty()
  chain!: string;

  @ApiProperty({ example: '10.5' })
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toAddress!: string;

  @ApiProperty({
    description:
      "Already-signed ERC-4337 UserOperation produced client-side. The backend never signs on the user's behalf.",
  })
  @IsObject()
  @IsNotEmpty()
  signedUserOperation!: Record<string, unknown>;
}
