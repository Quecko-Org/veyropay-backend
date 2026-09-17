import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClaimRecoveryDto {
  @ApiProperty({
    description:
      'Turnkey session JWT from stampLogin() with the new passkey that owns newOwnerAddress',
  })
  @IsString()
  @IsNotEmpty()
  sessionJwt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;
}
