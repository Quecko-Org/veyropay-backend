import { registerAs } from '@nestjs/config';
import { IProviderConfig } from '@shared/interfaces';

export interface ISendgridConfig extends IProviderConfig {
  fromEmail: string;
  fromName: string;
  guardianInvitationTemplateId?: string;
  recoveryRequestedTemplateId?: string;
  recoveryCompletedTemplateId?: string;
}

// SendGrid v3 Mail Send API - Bearer-authenticated, single POST /v3/mail/send endpoint.
// Template IDs are optional: when unset the client falls back to plain subject/content
// instead of a dynamic template (see sendgrid.client.ts).
export default registerAs('sendgrid', (): ISendgridConfig => ({
  baseUrl: process.env.SENDGRID_API_BASE_URL as string,
  apiKey: process.env.SENDGRID_API_KEY as string,
  timeoutMs: 10000,
  retryAttempts: 3,
  fromEmail: process.env.SENDGRID_FROM_EMAIL as string,
  fromName: process.env.SENDGRID_FROM_NAME as string,
  guardianInvitationTemplateId: process.env.SENDGRID_GUARDIAN_INVITATION_TEMPLATE_ID,
  recoveryRequestedTemplateId: process.env.SENDGRID_RECOVERY_REQUESTED_TEMPLATE_ID,
  recoveryCompletedTemplateId: process.env.SENDGRID_RECOVERY_COMPLETED_TEMPLATE_ID,
}));
