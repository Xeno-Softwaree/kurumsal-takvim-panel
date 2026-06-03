import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getEventLabels, type EventLabelDto } from '../api/settings';
import { useAuth } from '../auth/AuthContext';

type LabelsContextValue = {
  labels: EventLabelDto[];
  labelsByName: Record<string, EventLabelDto>;
  loading: boolean;
  refresh: () => Promise<void>;
  setLabels: (labels: EventLabelDto[]) => void;
};

const LabelsContext = createContext<LabelsContextValue | undefined>(undefined);

function normalizeName(name?: string) {
  if (!name) return '';
  return String(name).trim();
}

function normalizeHex(hex?: string) {
  if (!hex) return '';
  const v = String(hex).trim();
  if (!v) return '';
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return '';
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getLabelStyle(label?: EventLabelDto | null) {
  const color = normalizeHex(label?.color);
  if (!color) return undefined;
  return {
    backgroundColor: hexToRgba(color, 0.14),
    borderColor: hexToRgba(color, 0.35),
    color,
  } as const;
}

export function LabelsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [labels, setLabelsState] = useState<EventLabelDto[]>([]);
  const [loading, setLoading] = useState(false);

  const setLabels = useCallback((next: EventLabelDto[]) => {
    const normalized = (next || [])
      .map((x) => ({
        name: normalizeName(x?.name),
        pill: typeof x?.pill === 'string' ? x.pill.trim() : '',
        color: typeof x?.color === 'string' ? x.color.trim() : '',
      }))
      .filter((x) => x.name);
    setLabelsState(normalized);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setLabelsState([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getEventLabels();
      setLabels(data || []);
    } catch {
      setLabelsState([]);
    } finally {
      setLoading(false);
    }
  }, [setLabels, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const labelsByName = useMemo(() => {
    const map: Record<string, EventLabelDto> = {};
    for (const l of labels || []) {
      const name = normalizeName(l?.name);
      if (!name) continue;
      map[name] = l;
    }
    return map;
  }, [labels]);

  const value = useMemo<LabelsContextValue>(
    () => ({
      labels,
      labelsByName,
      loading,
      refresh,
      setLabels,
    }),
    [labels, labelsByName, loading, refresh, setLabels],
  );

  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>;
}

export function useLabels() {
  const ctx = useContext(LabelsContext);
  if (!ctx) throw new Error('useLabels must be used within LabelsProvider');
  return ctx;
}
