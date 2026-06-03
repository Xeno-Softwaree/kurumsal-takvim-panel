import { http } from './http';

export async function sendEventReminder(
  eventId: number,
  payload: { adminIds?: number[]; emails?: string[] } = {},
) {
  const res = await http.post<{ success: true }>(`/events/${eventId}/send-reminder`, payload);
  return res.data;
}
