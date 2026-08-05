import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

// Relayed verbatim to Turnkey - the client constructs and signs this entire activity
// itself using the recovery credential it decrypted from the recovery email. The
// backend cannot produce this stamp. See TurnkeyClient.recoverUser.
export class CompleteEmailRecoveryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'Turnkey userId returned by the init step' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Timestamp (ms) the client used when constructing/signing the activity',
  })
  @IsString()
  @IsNotEmpty()
  timestampMs!: string;

  @ApiProperty({ description: 'Human-readable name for the new passkey authenticator' })
  @IsString()
  @IsNotEmpty()
  authenticatorName!: string;

  @ApiProperty({ description: 'Base64url WebAuthn registration challenge' })
  @IsString()
  @IsNotEmpty()
  challenge!: string;

  @ApiProperty({ description: 'WebAuthn attestation object for the new passkey' })
  @IsObject()
  @IsNotEmpty()
  attestation!: Record<string, unknown>;

  @ApiProperty({
    description: 'X-Stamp header value, signed by the client using the recovery credential',
  })
  @IsString()
  @IsNotEmpty()
  stamp!: string;
}
