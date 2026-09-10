import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// Starts Turnkey email recovery - see docs.turnkey.com/authentication/backend-authentication.
// The client generates an ephemeral P-256 keypair; Turnkey emails a recovery credential
// encrypted to targetPublicKey. Completing recovery requires POST /auth/recover/complete.
export class InitEmailRecoveryDto {
  @ApiProperty({ example: 'owner@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description:
      'Compressed P-256 public key (hex) of the ephemeral key the client generated for this recovery',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-fA-F]+$/, { message: 'targetPublicKey must be hex' })
  targetPublicKey!: string;

  @ApiPropertyOptional({
    description: 'How long the recovery email credential remains valid (seconds)',
    example: '3600',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'expirationSeconds must be a numeric string' })
  expirationSeconds?: string;
}
