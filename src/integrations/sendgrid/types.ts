// Minimal shape of the SendGrid v3 Mail Send API request body - verified against
// @sendgrid/mail@8.1.6 / @sendgrid/helpers@8.0.0 source (Mail.create(data).toJSON()),
// not hand-guessed. See https://docs.sendgrid.com/api-reference/mail-send/mail-send.
export interface ISendgridEmailAddress {
  email: string;
  name?: string;
}

export interface ISendgridPersonalization {
  to: ISendgridEmailAddress[];
  dynamic_template_data?: Record<string, unknown>;
}

export interface ISendgridMailContent {
  type: 'text/plain' | 'text/html';
  value: string;
}

export interface ISendgridMailRequest {
  personalizations: ISendgridPersonalization[];
  from: ISendgridEmailAddress;
  subject?: string;
  content?: ISendgridMailContent[];
  template_id?: string;
}

export interface ISendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
}
