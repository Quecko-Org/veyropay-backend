import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEthereumAddress, IsNotEmpty, IsUUID } from 'class-validator';

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

  @ApiProperty({ example: 'owner@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  requestedByEmail!: string;
}
