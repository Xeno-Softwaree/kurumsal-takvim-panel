import { http } from './http';

export type LoginResponse = {
  token: string;
  admin: {
    id: number;
    email: string;
    is_super_admin: boolean;
  };
};

export async function loginRequest(email: string, password: string) {
  const res = await http.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function meRequest() {
  const res = await http.get<{
    id: number;
    email: string;
    is_super_admin: boolean;
  }>('/auth/me');
  return res.data;
}
