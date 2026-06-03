import { http } from './http';

export type StatsDto = {
  totalEvents: number;
  weekMeetings: number;
  activeAdmins: number;
  trends?: {
    events: number;
  };
};

export async function getStats() {
  const res = await http.get<StatsDto>('/stats');
  return res.data;
}
