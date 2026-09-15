import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEthereumAddress, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateRecoveryRequestDto {
  @ApiProperty({ description: 'Wallet id from recovery lookup' })
  @IsUUID()
  walletId!: string;

  @ApiProperty({
    example: '0x7ac800000000000000000000000000000000894e',
    description: 'New signer / owner address from the passkey created on this device',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEthereumAddress()
  @IsNotEmpty()
  newOwnerAddress!: string;

  @ApiPropertyOptional({
    example: 'owner@example.com',
    description: 'Defaults to the wallet owner email from lookup when omitted',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsEmail()
  requestedByEmail?: string;
}
