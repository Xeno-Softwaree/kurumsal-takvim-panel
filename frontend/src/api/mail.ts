import { http } from './http';

export async function sendTestMail(body: { to?: string }) {
  const res = await http.post<{ success: true }>('/mail/test', body);
  return res.data;
}
