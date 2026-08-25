import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import ms from 'ms';
import { IJwtConfig } from '@core/config/jwt.config';
import { IJwtPayload } from '@shared/interfaces';
import { NotificationType } from '@shared/enums';
import { TurnkeyService } from '@integrations/turnkey/turnkey.service';
import {
  DEFAULT_TURNKEY_WALLET_ACCOUNT_PARAMS,
  TURNKEY_ORGANIZATION_PROVIDER_KEY,
} from '@integrations/turnkey/constants';
import { ProfileService } from '@modules/profile/profile.service';
import { WalletService } from '@modules/wallet/wallet.service';
import { NotificationService } from '@modules/notification/notification.service';
import { SystemService } from '@modules/system/system.service';
import { DeviceSessionRepository } from './repositories/device-session.repository';
import { DeviceSessionEntity } from './entities/device-session.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { SignupDto } from './dto/signup.dto';
import { SignupResultDto } from './dto/signup-result.dto';
import { OauthLoginDto } from './dto/oauth-login.dto';
import { OauthLoginResultDto } from './dto/oauth-login-result.dto';

export interface IRequestMetadata {
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly turnkeyService: TurnkeyService,
    private readonly profileService: ProfileService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly systemService: SystemService,
    private readonly deviceSessionRepository: DeviceSessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Creates a Turnkey sub-organization for a new user, registering their passkey
  // (and the ephemeral API key their client generated for this signup) as root-user
  // credentials, and provisioning the first wallet+address atomically in the same
  // call. Returns only the sub-org ID (+ wallet address) - it does NOT issue our own
  // JWT. The client uses the ephemeral key to call Turnkey's stampLogin() itself,
  // then submits the resulting session JWT to POST /auth/login, same as any other
  // login. See docs.turnkey.com/authentication/backend-authentication ("Signup flow").
  async signup(dto: SignupDto): Promise<SignupResultDto> {
    const result = await this.turnkeyService.provisionSubOrganization({
      subOrganizationName: `${dto.userName}'s organization`,
      rootUsers: [
        {
          userName: dto.userName,
          userEmail: dto.userEmail,
          apiKeys: [
            {
              apiKeyName: 'signup-session-key',
              publicKey: dto.apiPublicKey,
              curveType: 'API_KEY_CURVE_P256',
            },
          ],
          authenticators: [
            {
              authenticatorName: dto.authenticatorName,
              challenge: dto.challenge,
              attestation: dto.attestation,
            },
          ],
          oauthProviders: [],
        },
      ],
      rootQuorumThreshold: 1,
      wallet: {
        walletName: 'Default Wallet',
        accounts: [DEFAULT_TURNKEY_WALLET_ACCOUNT_PARAMS],
      },
    });

    return new SignupResultDto({
      subOrganizationId: result.subOrganizationId,
      walletAddress: result.wallet?.addresses?.[0],
    });
  }

  // Google/Apple sign-in: gets-or-creates the sub-organization tied to this OIDC
  // identity, then mints a Turnkey session JWT for it. Like signup, this does NOT
  // issue our own JWT - the client submits the returned sessionJwt to POST /auth/login.
  // See docs.turnkey.com/features/authentication/social-logins.
  async oauthLogin(dto: OauthLoginDto): Promise<OauthLoginResultDto> {
    let organizationId = await this.turnkeyService.findSubOrganizationByOidcToken(dto.oidcToken);
 console.log('OAUTH LOOKUP RESULT', organizationId);   // <-- add this
    if (!organizationId) {
        console.log('NO MATCH - creating new sub-org');       // <-- add this
      const result = await this.turnkeyService.provisionSubOrganization({
        subOrganizationName: `${dto.userName ?? dto.providerName} organization`,
        rootUsers: [
          {
            userName: dto.userName ?? dto.providerName,
            userEmail: dto.userEmail,
            apiKeys: [],
            authenticators: [],
            oauthProviders: [{ providerName: dto.providerName, oidcToken: dto.oidcToken }],
          },
        ],
        rootQuorumThreshold: 1,
        wallet: {
          walletName: 'Default Wallet',
          accounts: [DEFAULT_TURNKEY_WALLET_ACCOUNT_PARAMS],
        },
      });
      organizationId = result.subOrganizationId;

    console.log('NEW SUB-ORG CREATED', organizationId);   // <-- add this
    }
    console.log("loginnn",organizationId)
    const loginResult = await this.turnkeyService.loginWithOauth(organizationId, {
      organizationId,
      oidcToken: dto.oidcToken,
      publicKey: dto.apiPublicKey,
    });
console.log("loginResult",loginResult)
    return new OauthLoginResultDto({ sessionJwt: loginResult.session });
  }

  // Unified session entry point: validates a Turnkey session JWT locally (signature +
  // expiry, no Turnkey API call) and issues our own app JWT. Fed by a session JWT
  // obtained via passkey stampLogin(), POST /auth/oauth-login, or (in a future phase)
  // OTP login - the backend doesn't care which method produced it. See
  // docs.turnkey.com/authentication/backend-authentication ("Validating the JWT").
  async login(dto: LoginDto, meta: IRequestMetadata): Promise<AuthTokensDto> {
    const identity = await this.turnkeyService.verifySessionToken(dto.sessionJwt);

    const user = await this.profileService.findOrCreateByTurnkeyUserId(identity.userId, dto.email);
console.log("user",user,dto)
    // Persisted so smart account provisioning can look up the user's Turnkey
    // sub-organization later without requiring the client to resend it.
    await this.profileService.setProviderReference(
      user.id,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
      identity.organizationId,
    );
console.log("identity",identity)
    // Wallet creation is automatic and transparent per docs/02_PRODUCT_REQUIREMENTS.md,
    // even though the on-chain smart account provider is still pending a decision.
    await this.walletService.getOrCreatePendingWallet(user.id);

    const session = await this.createDeviceSession(
      user.id,
      dto.deviceName,
      dto.platform,
      meta.ipAddress,
    );

    await this.notificationService.notify(
      user.id,
      NotificationType.AUTH,
      'New login',
      `Signed in on ${dto.platform ?? 'a device'}${dto.deviceName ? ` (${dto.deviceName})` : ''}.`,
    );

    await this.systemService.recordAudit(
      'login',
      user.id,
      { deviceName: dto.deviceName },
      meta.ipAddress,
    );

    return this.issueTokens(user.id, session.id);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    const jwt = this.configService.get<IJwtConfig>('jwt') as IJwtConfig;

    let payload: IJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<IJwtPayload>(dto.refreshToken, {
        secret: jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.deviceSessionRepository.findActiveById(payload.sid);
    if (!session) {
      throw new UnauthorizedException('Session has been revoked');
    }

    session.lastSeen = new Date();
    await this.deviceSessionRepository.save(session);

    return this.issueTokens(payload.sub, session.id);
  }

  async logout(sessionId: string): Promise<void> {
    await this.deviceSessionRepository.revoke(sessionId);
  }

  async listSessions(userId: string): Promise<DeviceSessionEntity[]> {
    return this.deviceSessionRepository.findAllForUser(userId);
  }

  // Used after identity recovery (new device/passkey via Turnkey) so the user can
  // invalidate sessions from before they lost access to their old device.
  async revokeAllOtherSessions(userId: string, exceptSessionId: string): Promise<void> {
    const sessions = await this.deviceSessionRepository.findAllForUser(userId);

    await Promise.all(
      sessions
        .filter((session) => session.id !== exceptSessionId)
        .map((session) => this.deviceSessionRepository.revoke(session.id)),
    );
  }

  private async createDeviceSession(
    userId: string,
    deviceName: string | undefined,
    platform: string | undefined,
    ipAddress: string | undefined,
  ): Promise<DeviceSessionEntity> {
    const session = this.deviceSessionRepository.create({
      userId,
      deviceName,
      platform,
      ipAddress,
      lastSeen: new Date(),
    });

    return this.deviceSessionRepository.save(session);
  }

  private issueTokens(userId: string, sessionId: string): AuthTokensDto {
    const jwt = this.configService.get<IJwtConfig>('jwt') as IJwtConfig;
    const payload: IJwtPayload = { sub: userId, sid: sessionId };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwt.refreshSecret,
      expiresIn: jwt.refreshExpiresIn as JwtSignOptions['expiresIn'],
    });

    return new AuthTokensDto({
      accessToken,
      refreshToken,
      expiresIn: Math.floor(ms(jwt.accessExpiresIn as ms.StringValue) / 1000),
    });
  }
}
