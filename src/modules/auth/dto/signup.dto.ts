import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

// Passkey signup - see docs.turnkey.com/authentication/backend-authentication
// ("Signup flow"). The client performs the WebAuthn ceremony and generates an
// ephemeral API key itself; this endpoint only creates the Turnkey sub-organization
// and registers both credentials on it. The client then calls Turnkey's
// stampLogin() directly (using the ephemeral key) to obtain a session JWT, which it
// submits to POST /auth/login.
export class SignupDto {
  @ApiProperty({ description: 'Human-readable name for the new user' })
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @ApiProperty({ description: 'Human-readable name for the passkey authenticator' })
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

  @ApiProperty({
    description:
      'Compressed P-256 public key of the ephemeral API key the client generated for this signup',
  })
  @IsString()
  @IsNotEmpty()
  apiPublicKey!: string;
}
