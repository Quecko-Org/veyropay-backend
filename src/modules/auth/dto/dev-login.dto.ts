import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DevLoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'Owner' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
