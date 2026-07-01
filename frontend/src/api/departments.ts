import { http } from './http';

export type DepartmentDto = {
  id: number;
  name: string;
  created_at: string;
};

export async function getDepartments(): Promise<DepartmentDto[]> {
  const res = await http.get<DepartmentDto[]>('/departments');
  return res.data;
}

export async function createDepartment(name: string): Promise<DepartmentDto> {
  const res = await http.post<DepartmentDto>('/departments', { name });
  return res.data;
}

export async function updateDepartment(id: number, name: string): Promise<DepartmentDto> {
  const res = await http.put<DepartmentDto>(`/departments/${id}`, { name });
  return res.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await http.delete(`/departments/${id}`);
}
