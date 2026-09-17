import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class RecoverAuthenticatorDto {
  @ApiProperty({ description: 'Human-readable name for the new passkey' })
  @IsString()
  @IsNotEmpty()
  authenticatorName!: string;

  @ApiProperty({ description: 'Base64url WebAuthn registration challenge' })
  @IsString()
  @IsNotEmpty()
  challenge!: string;

  @ApiProperty({
    description: 'WebAuthn attestation object produced by navigator.credentials.create()',
  })
  @IsObject()
  @IsNotEmpty()
  attestation!: Record<string, unknown>;
}

// Relays a client-stamped ACTIVITY_TYPE_RECOVER_USER to Turnkey. The backend cannot
// produce the stamp - only the recovery credential from the email can.
export class CompleteEmailRecoveryDto {
  @ApiProperty({ description: 'Turnkey sub-organization id from /auth/recover/init' })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'Turnkey user id from /auth/recover/init' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Client-supplied activity timestamp (ms), signed into the stamp' })
  @IsString()
  @IsNotEmpty()
  timestampMs!: string;

  @ApiProperty({ type: RecoverAuthenticatorDto })
  @ValidateNested()
  @Type(() => RecoverAuthenticatorDto)
  authenticator!: RecoverAuthenticatorDto;

  @ApiProperty({ description: 'X-Stamp value produced with the recovery credential' })
  @IsString()
  @IsNotEmpty()
  stamp!: string;
}
