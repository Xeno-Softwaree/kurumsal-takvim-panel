import { http } from './http';

export type HeatmapPointDto = {
  date: string; // YYYY-MM-DD
  count: number;
};

export async function getHeatmap(params: { days?: number } = {}) {
  const res = await http.get<HeatmapPointDto[]>('/stats/heatmap', { params });
  return res.data;
}
