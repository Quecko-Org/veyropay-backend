import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddGuardianDto {
  @ApiProperty({ description: 'Email address to send the guardian invitation to' })
  @IsEmail()
  @IsNotEmpty()
  guardianEmail!: string;

  @ApiPropertyOptional({ description: 'Human-readable name for this guardian' })
  @IsOptional()
  @IsString()
  guardianName?: string;
}
