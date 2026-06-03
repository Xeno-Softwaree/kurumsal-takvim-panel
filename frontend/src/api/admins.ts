import { http } from './http';

export type AdminDto = {
  id: number;
  email: string;
  is_super_admin: number | boolean;
  created_at: string;
  updated_at?: string;
};

export async function getAdmins() {
  const res = await http.get<AdminDto[]>('/admins');
  return res.data;
}

export async function createAdmin(body: { email: string; password: string }) {
  const res = await http.post<AdminDto>('/admins', body);
  return res.data;
}

export async function deleteAdmin(id: number) {
  await http.delete(`/admins/${id}`);
}
