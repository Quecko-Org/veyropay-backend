import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ApproveRecoveryDto {
  @ApiProperty({
    description:
      'EIP-712 signature from the guardian Turnkey signer over the recovery typed data / hash',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]{130}$/, {
    message: 'signature must be a 65-byte ECDSA signature (0x + 130 hex chars)',
  })
  signature!: string;
}
