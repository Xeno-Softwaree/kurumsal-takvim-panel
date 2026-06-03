import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Tag, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLabels } from '../labels/LabelsContext';
import {
  EventLabelDto,
  updateEventLabels,
} from '../api/settings';

type Row = {
  id: string;
  name: string;
  pill: string;
  color: string;
};

function makeRow(partial?: Partial<Omit<Row, 'id'>>): Row {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return {
    id,
    name: partial?.name ?? '',
    pill: partial?.pill ?? '',
    color: partial?.color ?? '',
  };
}

export default function Labels() {
  const { token, admin } = useAuth();
  const isAllowed = !!admin?.is_super_admin;
  const { labels, setLabels: setGlobalLabels } = useLabels();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!isAllowed) return false;
    return rows.some((r) => r.name.trim());
  }, [isAllowed, rows]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      if (!isAllowed) return;
      setLoading(true);
      setError(null);
      setSuccess(null);
      const normalized = (labels || []).map((x: EventLabelDto) =>
        makeRow({
          name: String(x?.name || ''),
          pill: String(x?.pill || ''),
          color: String(x?.color || ''),
        }),
      );
      setRows(normalized);
      setLoading(false);
    }

    load();
  }, [isAllowed, labels, token]);

  const handleAdd = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!isAllowed) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: EventLabelDto[] = rows
      .map((r) => ({
        name: r.name.trim(),
        pill: r.pill.trim(),
        color: r.color.trim(),
      }))
      .filter((r) => r.name);

    try {
      const saved = await updateEventLabels({ labels: payload });
      const next = (saved || []).map((x) =>
        makeRow({
          name: String(x?.name || ''),
          pill: String(x?.pill || ''),
          color: String(x?.color || ''),
        }),
      );
      setRows(next);
      setGlobalLabels(saved || []);
      setSuccess('Etiketler kaydedildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etiketler kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="rounded-2xl border border-app-border bg-app-card p-6 text-sm text-app-text shadow-sm backdrop-blur-[10px] transition">
        Bu sayfaya sadece süper admin erişebilir.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent-soft text-app-text shadow-sm ring-1 ring-app-border">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">Etiketler</h2>
            <p className="text-xs text-app-muted">
              Etkinlik etiketlerini yönet (sadece super admin).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-xs font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Etiket</span>
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {success}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm backdrop-blur-[10px] transition">
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_140px_64px] gap-3 border-b border-app-border bg-app-base px-4 py-3 text-[11px] font-semibold text-app-muted">
            <div>Ad</div>
            <div>Pill Class</div>
            <div>Renk</div>
            <div />
          </div>

          {loading ? (
            <div className="px-4 py-6 text-xs text-app-muted">Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-xs text-app-muted italic text-center">
              Etiket bulunmuyor.
            </div>
          ) : (
            <ul className="divide-y divide-app-border">
              {rows.map((r, idx) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_140px_64px] gap-3 px-4 py-3 text-xs"
                >
                  <input
                    id={`label-name-${r.id}`}
                    name={`label-name-${r.id}`}
                    value={r.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, name: v } : x)),
                      );
                    }}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Örn: Toplantı"
                  />
                  <input
                    id={`label-pill-${r.id}`}
                    name={`label-pill-${r.id}`}
                    value={r.pill}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, pill: v } : x)),
                      );
                    }}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="bg-red-500/20 text-red-400 ..."
                  />
                  <input
                    id={`label-color-${r.id}`}
                    name={`label-color-${r.id}`}
                    value={r.color}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, color: v } : x)),
                      );
                    }}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="#f87171"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setRows((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Kaydediliyor…' : 'Kaydet'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
