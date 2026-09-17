import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser } from '@common/decorators';
import { IJwtPayload } from '@shared/interfaces';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { SignupDto } from './dto/signup.dto';
import { SignupResultDto } from './dto/signup-result.dto';
import { OauthLoginDto } from './dto/oauth-login.dto';
import { OauthLoginResultDto } from './dto/oauth-login-result.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { InitEmailRecoveryDto } from './dto/init-email-recovery.dto';
import { InitEmailRecoveryResultDto } from './dto/init-email-recovery-result.dto';
import { CompleteEmailRecoveryDto } from './dto/complete-email-recovery.dto';
import { CompleteEmailRecoveryResultDto } from './dto/complete-email-recovery-result.dto';
import { AUTH_RECOVERY_THROTTLE_LIMIT, AUTH_RECOVERY_THROTTLE_TTL_MS } from './constants';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Create a Turnkey sub-organization for a new user (passkey signup)',
    description:
      'Returns the new sub-organization ID, not a backend session - the client must ' +
      'call Turnkey stampLogin() with its ephemeral key next, then POST /auth/login.',
  })
  signup(@Body() dto: SignupDto): Promise<SignupResultDto> {
    return this.authService.signup(dto);
  }

  @Post('oauth-login')
  @ApiOperation({
    summary: 'Google/Apple sign-in - gets-or-creates the sub-organization and mints a session',
    description:
      'Returns a Turnkey session JWT, not a backend session - the client must submit ' +
      'it to POST /auth/login next.',
  })
  oauthLogin(@Body() dto: OauthLoginDto): Promise<OauthLoginResultDto> {
    return this.authService.oauthLogin(dto);
  }

  @Post('dev-login')
  @ApiOperation({
    summary: '[DEV ONLY] Create or reuse a local user and mint a backend JWT',
    description:
      'Bypasses Turnkey/passkeys for local Swagger testing. Disabled outside development/test.',
  })
  devLogin(@Body() dto: DevLoginDto, @Req() req: Request): Promise<AuthTokensDto> {
    return this.authService.devLogin(dto, { ipAddress: req.ip });
  }

  @Post('recover/init')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RECOVERY_THROTTLE_LIMIT, ttl: AUTH_RECOVERY_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Start Turnkey email recovery (lost passkey / device)',
    description:
      'Looks up the Turnkey sub-organization for this email and asks Turnkey to send a ' +
      'recovery credential encrypted to targetPublicKey. Returns userId + organizationId ' +
      'for POST /auth/recover/complete. Does not change Safe ownership (use /recovery for ' +
      'guardian social recovery).',
  })
  initEmailRecovery(@Body() dto: InitEmailRecoveryDto): Promise<InitEmailRecoveryResultDto> {
    return this.authService.initEmailRecovery(dto);
  }

  @Post('recover/complete')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: AUTH_RECOVERY_THROTTLE_LIMIT, ttl: AUTH_RECOVERY_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Complete Turnkey email recovery by registering a new passkey',
    description:
      'Relays the client-stamped recover_user activity to Turnkey. After success, call ' +
      'Turnkey stampLogin() then POST /auth/login. Existing device sessions are revoked.',
  })
  completeEmailRecovery(
    @Body() dto: CompleteEmailRecoveryDto,
  ): Promise<CompleteEmailRecoveryResultDto> {
    return this.authService.completeEmailRecovery(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Exchange a Turnkey session JWT for a backend session' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokensDto> {
    return this.authService.login(dto, { ipAddress: req.ip });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke the current device session' })
  logout(@CurrentUser() user: IJwtPayload): Promise<void> {
    return this.authService.logout(user.sid);
  }
}
