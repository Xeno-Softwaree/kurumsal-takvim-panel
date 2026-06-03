import { http } from './http';

export type EventDto = {
  id: number;
  title: string;
  description?: string;
  type?: string;
  label?: string; // Added to handle DB field variations
  department?: string | null;
  participantCount?: number;
  date: string;
  status: string;
  recurrence_rule?: string | null;
  created_by_admin_id?: number | null;
  admin_email?: string;
};

export type GetEventsParams = {
  start?: string;
  end?: string;
  year?: number;
  adminId?: number;
  search?: string;
  department?: string;
  status?: 'past' | 'future';
  type?: string;
  includeAdmin?: 0 | 1;
  limit?: number;
};

export async function getEvents(params: GetEventsParams) {
  const res = await http.get<EventDto[]>('/events', { params });
  return res.data;
}

export async function getUpcomingEvents(params: {
  limit?: number;
  department?: string;
  search?: string;
}) {
  const res = await http.get<EventDto[]>('/events/upcoming', { params });
  return res.data;
}

export async function createEvent(body: {
  title: string;
  description?: string;
  type?: string;
  department?: string;
  participantCount?: number;
  date: string;
  status?: string;
  recurrence_rule?: string | null;
}) {
  const res = await http.post<EventDto>('/events', body);
  return res.data;
}

export async function updateEvent(
  id: number,
  body: {
    title: string;
    description?: string;
    type?: string;
    department?: string;
    participantCount?: number;
    date: string;
    status?: string;
    recurrence_rule?: string | null;
  },
) {
  const res = await http.put<EventDto>(`/events/${id}`, body);
  return res.data;
}

export async function cancelEvent(id: number) {
  await http.delete(`/events/${id}`);
}
