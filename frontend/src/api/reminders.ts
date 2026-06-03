import { http } from './http';

export interface UpcomingReminder {
  id: number;
  title: string;
  date: string;
  type: string | null;
  department: string | null;
  deliveredStages: string[];
}

export interface ReminderHistory {
  id: number;
  event_id: number;
  stage: string;
  delivered_at: string;
  event_title: string;
  event_date: string;
  event_type: string | null;
}

export async function getUpcomingReminders(): Promise<UpcomingReminder[]> {
  const res = await http.get<UpcomingReminder[]>('/reminders/upcoming');
  return res.data;
}

export async function getReminderHistory(): Promise<ReminderHistory[]> {
  const res = await http.get<ReminderHistory[]>('/reminders/history');
  return res.data;
}
