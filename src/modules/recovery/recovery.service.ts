import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@shared/enums';
import { IAppConfig } from '@core/config/app.config';
import { AuthService } from '@modules/auth/auth.service';
import { NotificationService } from '@modules/notification/notification.service';
import { ProfileService } from '@modules/profile/profile.service';
import { SystemService } from '@modules/system/system.service';
import { TurnkeyService } from '@integrations/turnkey/turnkey.service';
import { TURNKEY_ORGANIZATION_PROVIDER_KEY } from '@integrations/turnkey/constants';
import { InitEmailRecoveryDto } from './dto/init-email-recovery.dto';
import { CompleteEmailRecoveryDto } from './dto/complete-email-recovery.dto';

export interface IInitEmailRecoveryResult {
  organizationId: string;
  userId: string;
}

// Identity recovery (lost device, new passkey, social login recovery) is handled
// mostly by Turnkey - a recovered session simply logs in again via AuthService.login(),
// which resolves to the same user by turnkeyUserId. Email recovery specifically needs
// backend orchestration (looking up which sub-org a given email belongs to) since the
// requester has no session and doesn't know their organizationId. This service also
// covers the backend-side follow-up: reviewing and revoking sessions from before
// access was lost.
//
// Guardian-based wallet recovery is intentionally NOT implemented here - see
// docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1 and src/modules/guardian-recovery/.
@Injectable()
export class RecoveryService {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
    private readonly systemService: SystemService,
    private readonly turnkeyService: TurnkeyService,
    private readonly configService: ConfigService,
  ) {}

  async listSessions(userId: string) {
    return this.authService.listSessions(userId);
  }

  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.authService.revokeAllOtherSessions(userId, currentSessionId);

    await this.notificationService.notify(
      userId,
      NotificationType.RECOVERY,
      'Sessions revoked',
      'All other device sessions have been signed out.',
    );

    await this.systemService.recordAudit('recovery.identity.sessions_revoked', userId, {
      exceptSessionId: currentSessionId,
    });
  }

  // Unauthenticated by design - returns null (not an error) if the email doesn't
  // match an account, so the controller can respond identically either way.
  async initiateEmailRecovery(dto: InitEmailRecoveryDto): Promise<IInitEmailRecoveryResult | null> {
    const user = await this.profileService.findByEmail(dto.email);
    if (!user) {
      return null;
    }

    const organizationId = await this.profileService.getProviderReference(
      user.id,
      TURNKEY_ORGANIZATION_PROVIDER_KEY,
    );
    if (!organizationId) {
      throw new ConflictException('This account has no linked Turnkey organization');
    }

    const app = this.configService.get<IAppConfig>('app') as IAppConfig;

    const result = await this.turnkeyService.initEmailRecovery({
      organizationId,
      email: dto.email,
      targetPublicKey: dto.targetPublicKey,
      emailCustomization: { appName: app.name },
    });

    await this.notificationService.notify(
      user.id,
      NotificationType.RECOVERY,
      'Recovery initiated',
      'An identity recovery email was sent. If this was not you, contact support immediately.',
    );

    await this.systemService.recordAudit('recovery.identity.email_initiated', user.id, {
      email: dto.email,
    });

    return { organizationId, userId: result.userId };
  }

  // Relays the client-stamped recover_user activity (registers the new passkey). On
  // success, the client still needs to call Turnkey's stampLogin() with the new
  // passkey and then POST /auth/login, same as any other login - this endpoint only
  // completes the Turnkey-side recovery, it doesn't issue our own JWT.
  async completeEmailRecovery(dto: CompleteEmailRecoveryDto): Promise<{ userId: string }> {
    const result = await this.turnkeyService.completeRecovery({
      organizationId: dto.organizationId,
      userId: dto.userId,
      timestampMs: dto.timestampMs,
      authenticator: {
        authenticatorName: dto.authenticatorName,
        challenge: dto.challenge,
        attestation: dto.attestation,
      },
      stamp: dto.stamp,
    });

    await this.systemService.recordAudit('recovery.identity.passkey_changed', undefined, {
      turnkeyUserId: dto.userId,
      organizationId: dto.organizationId,
    });

    return result;
  }
}
