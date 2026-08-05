import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISendgridConfig } from '@core/config/sendgrid.config';
import { ISendEmailParams, ISendgridMailRequest } from './types';
import { SENDGRID_MAIL_SEND_PATH } from './constants';

// Thin HTTP client wrapper around the SendGrid v3 Mail Send API. Bearer-authenticated,
// single endpoint - request shape verified against the official @sendgrid/mail package
// source rather than transcribed from memory.
@Injectable()
export class SendgridClient {
  private readonly config: ISendgridConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<ISendgridConfig>('sendgrid') as ISendgridConfig;
  }

  async sendMail(params: ISendEmailParams): Promise<void> {
    const body: ISendgridMailRequest = {
      personalizations: [
        {
          to: [{ email: params.to, name: params.toName }],
          ...(params.templateId && params.dynamicTemplateData
            ? { dynamic_template_data: params.dynamicTemplateData }
            : {}),
        },
      ],
      from: { email: this.config.fromEmail, name: this.config.fromName },
      ...(params.templateId
        ? { template_id: params.templateId }
        : { subject: params.subject, content: [{ type: 'text/plain', value: params.text }] }),
    };

    await this.request(SENDGRID_MAIL_SEND_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  private async request(path: string, init: RequestInit): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      // SendGrid returns 202 Accepted with an empty body on success.
      if (!response.ok) {
        throw new Error(`SendGrid request failed with status ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
