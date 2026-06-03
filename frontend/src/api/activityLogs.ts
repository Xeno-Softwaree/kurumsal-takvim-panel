import { http } from './http';

export type ActivityLogDto = {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
  admin_email?: string;
  meta?: string | null;
};

export async function getActivityLogs(params: { limit?: number } = {}) {
  const res = await http.get<ActivityLogDto[]>('/activity-logs', { params });
  return res.data;
}
