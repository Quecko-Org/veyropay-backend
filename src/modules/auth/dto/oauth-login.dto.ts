import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Google/Apple social login - see docs.turnkey.com/features/authentication/social-logins.
// The client obtains oidcToken from the provider's native SDK directly (never through
// our backend) and generates its own ephemeral API key. This endpoint gets-or-creates
// the Turnkey sub-organization for that identity and returns a Turnkey session JWT,
// which the client then submits to POST /auth/login exactly like passkey login.
export class OauthLoginDto {
  @ApiProperty({ description: 'Base64 OIDC id_token from Google/Apple' })
  @IsString()
  @IsNotEmpty()
  oidcToken!: string;

  @ApiProperty({
    description:
      'Compressed P-256 public key of the ephemeral API key the client generated for this login',
  })
  @IsString()
  @IsNotEmpty()
  apiPublicKey!: string;

  @ApiProperty({ description: 'OAuth provider name, e.g. "Google" or "Apple"' })
  @IsString()
  @IsNotEmpty()
  providerName!: string;

  @ApiPropertyOptional({
    description: 'Used only if this identity has no existing sub-organization yet',
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  userEmail?: string;
}
