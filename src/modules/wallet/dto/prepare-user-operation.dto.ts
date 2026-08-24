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
}
