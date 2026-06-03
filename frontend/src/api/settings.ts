import { http } from './http';

export type SmtpSettingsDto = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string; // masked: '********' or ''
  fromEmail?: string;
  fromName?: string;
  source?: 'db' | 'env';
};

export type MailSettingsDto = {
  mode: 'api' | 'smtp';
  apiKey: string; // masked: '********' or ''
  senderEmail: string;
};

export type EventLabelDto = {
  name: string;
  pill?: string;
  color?: string;
};

export async function getSmtpSettings() {
  const res = await http.get<SmtpSettingsDto>('/settings/smtp');
  return res.data;
}

export async function updateSmtpSettings(body: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}) {
  const res = await http.put<SmtpSettingsDto>('/settings/smtp', body);
  return res.data;
}

export async function getMailSettings() {
  const res = await http.get<MailSettingsDto>('/settings/mail');
  return res.data;
}

export async function updateMailSettings(body: { apiKey?: string }) {
  const res = await http.put<MailSettingsDto>('/settings/mail', body);
  return res.data;
}

export async function getEventLabels() {
  const res = await http.get<EventLabelDto[]>('/settings/labels');
  return res.data;
}

export async function updateEventLabels(body: { labels: EventLabelDto[] }) {
  const res = await http.put<EventLabelDto[]>('/settings/labels', body);
  return res.data;
}
