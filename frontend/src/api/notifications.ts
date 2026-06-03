import { http } from './http';

export type NotificationDto = {
  id: number;
  admin_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  payload: string | null;
  is_read: number | boolean;
  created_at: string;
};

export async function getNotifications(params?: { limit?: number }) {
  const res = await http.get<NotificationDto[]>('/notifications', { params });
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await http.get<{ count: number }>('/notifications/unread-count');
  return res.data;
}

export async function markNotificationRead(id: number) {
  const res = await http.post<{ success: true }>(`/notifications/${id.toString()}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await http.post<{ success: true }>('/notifications/read-all');
  return res.data;
}
