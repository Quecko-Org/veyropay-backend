import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class LookupRecoveryByAddressDto {
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Smart account address',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEthereumAddress()
  @IsNotEmpty()
  address!: string;
}
