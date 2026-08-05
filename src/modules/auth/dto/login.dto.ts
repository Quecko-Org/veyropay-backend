import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Session JWT obtained by the client directly from Turnkey - via passkey stampLogin(),
// or via the sessionJwt returned from POST /auth/oauth-login. The backend validates
// this locally (signature + expiry), it never contacts Turnkey for a normal login.
export class LoginDto {
  @ApiProperty({ description: 'Turnkey session JWT' })
  @IsString()
  @IsNotEmpty()
  sessionJwt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;
}
