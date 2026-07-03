import { http } from './http';

export type StaffDto = {
  id: number;
  first_name: string;
  last_name: string;
  tc_no: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  department_id: number | null;
  department_name: string | null;
  directorate_id: number | null;
  directorate_name: string | null;
  is_volunteer: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type StaffActiveAssignment = {
  id: number;
  quantity: number;
  status: 'assigned';
  assigned_at: string;
  notes: string | null;
  variant_id: number;
  variant_label: string | null;
  item_id: number;
  item_name: string;
  category: string | null;
};

export type StaffDetailDto = StaffDto & { active_assignments: StaffActiveAssignment[] };

export type StaffInput = {
  first_name: string;
  last_name: string;
  tc_no?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  department_id?: number | null;
  directorate_id?: number | null;
  is_volunteer: boolean;
  status?: 'active' | 'inactive';
};

export async function getStaffList(): Promise<StaffDto[]> {
  const res = await http.get<StaffDto[]>('/staff');
  return res.data;
}

export async function getStaffMember(id: number): Promise<StaffDetailDto> {
  const res = await http.get<StaffDetailDto>(`/staff/${id}`);
  return res.data;
}

export async function createStaff(data: StaffInput): Promise<StaffDto> {
  const res = await http.post<StaffDto>('/staff', data);
  return res.data;
}

export async function updateStaff(id: number, data: StaffInput): Promise<StaffDto> {
  const res = await http.put<StaffDto>(`/staff/${id}`, data);
  return res.data;
}

export async function deleteStaff(id: number): Promise<void> {
  await http.delete(`/staff/${id}`);
}
