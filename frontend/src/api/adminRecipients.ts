import { http } from './http';

export type AdminRecipientDto = {
  id: number;
  email: string;
};

export async function getAdminRecipients() {
  const res = await http.get<AdminRecipientDto[]>('/admins/recipients');
  return res.data;
}
