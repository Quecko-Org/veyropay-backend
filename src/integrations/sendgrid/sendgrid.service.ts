import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISendgridConfig } from '@core/config/sendgrid.config';
import { SendgridClient } from './sendgrid.client';
import { SENDGRID_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on SendgridClient directly. Email
// delivery is treated as best-effort everywhere it's called from (guardian invitation,
// recovery lifecycle) - a SendGrid outage must never block the underlying off-chain
// workflow, so failures are logged and swallowed here rather than thrown.
@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private readonly config: ISendgridConfig;

  constructor(
    private readonly client: SendgridClient,
    configService: ConfigService,
  ) {
    this.config = configService.get<ISendgridConfig>('sendgrid') as ISendgridConfig;
  }

  async sendGuardianInvitation(params: {
    to: string;
    toName?: string;
    inviterEmail: string;
    invitationUrl: string;
  }): Promise<void> {
    await this.send(
      params.to,
      params.toName,
      'You have been invited as a recovery guardian',
      `${params.inviterEmail} has invited you to be a wallet recovery guardian. ` +
        `Accept the invitation: ${params.invitationUrl}`,
      this.config.guardianInvitationTemplateId,
      { inviterEmail: params.inviterEmail, invitationUrl: params.invitationUrl },
    );
  }

  async sendRecoveryRequested(params: { to: string; recoveryRequestUrl: string }): Promise<void> {
    await this.send(
      params.to,
      undefined,
      'Wallet recovery requested',
      `A wallet recovery request was initiated on your account. If this was not you, contact ` +
        `support immediately. Track status: ${params.recoveryRequestUrl}`,
      this.config.recoveryRequestedTemplateId,
      { recoveryRequestUrl: params.recoveryRequestUrl },
    );
  }

  async sendRecoveryCompleted(params: { to: string; transactionHash: string }): Promise<void> {
    await this.send(
      params.to,
      undefined,
      'Wallet recovery completed',
      `Your wallet recovery has been executed on-chain. Transaction: ${params.transactionHash}`,
      this.config.recoveryCompletedTemplateId,
      { transactionHash: params.transactionHash },
    );
  }

  private async send(
    to: string,
    toName: string | undefined,
    subject: string,
    text: string,
    templateId: string | undefined,
    dynamicTemplateData: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.client.sendMail({ to, toName, subject, text, templateId, dynamicTemplateData });
    } catch (error) {
      this.logger.warn(
        { err: error, provider: SENDGRID_PROVIDER_NAME },
        `SendGrid email delivery failed: ${subject}`,
      );
    }
  }
}
