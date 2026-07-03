import { http } from './http';

export type DirectorateDto = {
  id: number;
  name: string;
  created_at: string;
};

export async function getDirectorates(): Promise<DirectorateDto[]> {
  const res = await http.get<DirectorateDto[]>('/directorates');
  return res.data;
}

export async function createDirectorate(name: string): Promise<DirectorateDto> {
  const res = await http.post<DirectorateDto>('/directorates', { name });
  return res.data;
}

export async function updateDirectorate(id: number, name: string): Promise<DirectorateDto> {
  const res = await http.put<DirectorateDto>(`/directorates/${id}`, { name });
  return res.data;
}

export async function deleteDirectorate(id: number): Promise<void> {
  await http.delete(`/directorates/${id}`);
}
