import { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import {
  CalendarClock, FileDown, FileSpreadsheet, Pencil, Trash2,
  Users, CheckSquare, Square, Loader2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cancelEvent, getEvents, EventDto } from '../api/events';
import { getLabelStyle, useLabels } from '../labels/LabelsContext';
import { exportEventsToExcel, type ExportEventRow } from '../export/eventsExport';
import { EventPdfDownloadLink } from '../components/EventPdfDocument';
import VirtualScroll from '../components/VirtualScroll';
import { Select } from '../components/Form';

export default function PastEvents() {
  const navigate = useNavigate();
  const { labelsByName } = useLabels();
  const { confirm } = useConfirm();
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [limit] = useState(100);
  const [hasMore, setHasMore] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  function normalizeType(type?: string) {
    if (!type || typeof type !== 'string') return '';
    return type.trim();
  }

  function normalizeEvent(event: any): EventDto {
    return {
      id: event?.id || 0,
      title: event?.title || 'Başlıksız Etkinlik',
      date: event?.date || new Date().toISOString(),
      type: normalizeType(event?.type || event?.label),
      label: normalizeType(event?.label || event?.type),
      participantCount: Number.isFinite(Number(event?.participantCount)) ? Number(event.participantCount) : 0,
      description: event?.description || '',
      status: event?.status || 'unknown',
      department: event?.department || '',
    };
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSelectedIds(new Set());
      try {
        const data = await getEvents({ status: 'past', type: selectedType || undefined, includeAdmin: 1, limit });
        const normalizedData = (data || []).map(normalizeEvent).filter(e => e && e.id);
        setEvents(normalizedData);
        setHasMore(normalizedData.length === limit);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedType]);

  const rows = useMemo(() => {
    let filtered = (events || []).filter((e) => e && e.status !== 'cancelled');
    if (selectedType) {
      filtered = filtered.filter(e =>
        (e.type && e.type.trim() === selectedType.trim()) ||
        (e.label && e.label.trim() === selectedType.trim())
      );
    }
    return filtered;
  }, [events, selectedType]);

  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map(r => r.id)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedRows = useMemo(
    () => rows.filter(r => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  const bulkExportRows = useMemo<ExportEventRow[]>(
    () => selectedRows.map(ev => ({
      title: ev.title,
      date: ev.date,
      label: normalizeType(ev.type) || '—',
      participantCount: Number.isFinite(Number(ev.participantCount)) ? Number(ev.participantCount) : 0,
      description: ev.description || '',
    })),
    [selectedRows]
  );

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try { await cancelEvent(id); } catch {}
    }
    setEvents(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
  };

  const exportRows = useMemo<ExportEventRow[]>(
    () => rows.map(ev => ({
      title: ev.title, date: ev.date,
      label: normalizeType(ev.type) || '—',
      participantCount: Number.isFinite(Number(ev.participantCount)) ? Number(ev.participantCount) : 0,
      description: ev.description || '',
    })),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent-soft text-app-text shadow-sm ring-1 ring-app-border">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">Geçmiş Etkinlikler</h2>
            <p className="text-xs text-app-muted">
              Bugünden önce gerçekleşmiş etkinliklerin arşivi.
              {rows.length > 0 && ` (${rows.length} etkinlik)`}
            </p>
          </div>
        </div>

        <div className="flex flex-1 sm:max-w-xs items-center gap-2">
          <div className="flex-1">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={[
                { value: '', label: 'Tüm Etiketler' },
                ...Object.values(labelsByName).map((l) => ({ value: l.name, label: l.name })),
              ]}
              className="!py-1.5 !text-xs !bg-app-base !border-app-border !text-app-text"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportEventsToExcel('gecmis-etkinlikler.xlsx', exportRows)}
            disabled={loading || exportRows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-500/15 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel'e Aktar</span>
          </button>
          <EventPdfDownloadLink filename="gecmis-etkinlikler.pdf" title="Geçmiş Etkinlikler" rows={exportRows}>
            <button
              type="button"
              disabled={loading || exportRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-[11px] font-semibold text-indigo-100 shadow-sm transition hover:bg-indigo-500/15 disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              <span>PDF Olarak İndir</span>
            </button>
          </EventPdfDownloadLink>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-2.5 gap-3"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <div className="flex items-center gap-2 text-[12px] font-600" style={{ color: '#818cf8' }}>
            <CheckSquare className="h-4 w-4" />
            <span>{selectedIds.size} etkinlik seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportEventsToExcel('secili-etkinlikler.xlsx', bulkExportRows)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-600 text-emerald-100 transition hover:bg-emerald-500/15"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <EventPdfDownloadLink filename="secili-etkinlikler.pdf" title="Seçili Etkinlikler" rows={bulkExportRows}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-600 text-indigo-100 transition hover:bg-indigo-500/15"
              >
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </button>
            </EventPdfDownloadLink>
            {!confirmBulkDelete ? (
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-600 text-rose-200 transition hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Seçilenleri Sil
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-600" style={{ color: '#fda4af' }}>
                  {selectedIds.size} etkinlik silinecek. Emin misin?
                </span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-700 text-white transition disabled:opacity-60"
                  style={{ background: '#dc2626' }}
                >
                  {bulkDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Sil
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-md transition hover:opacity-70"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:opacity-70"
              style={{ color: 'var(--app-text-muted)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div id="past-events-table" className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm backdrop-blur-[10px] transition">
        <div className="grid grid-cols-[32px_minmax(0,1.1fr)_160px_140px_110px_minmax(0,1fr)_120px] gap-3 border-b border-app-border bg-app-base px-4 py-3 text-[11px] font-semibold text-app-muted">
          <div className="flex items-center">
            <button type="button" onClick={toggleAll} className="flex items-center justify-center" title={allSelected ? 'Tümünü kaldır' : 'Tümünü seç'}>
              {allSelected
                ? <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                : <Square className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div>Başlık</div>
          <div>Tarih</div>
          <div>Etiket</div>
          <div>Katılımcı</div>
          <div>Açıklama</div>
          <div className="text-right">İşlemler</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-xs text-slate-400">Yükleniyor…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-xs text-slate-400">Arşiv etkinliği bulunmuyor.</div>
        ) : (
          <div style={{ height: '600px' }}>
            <VirtualScroll
              items={rows}
              itemHeight={60}
              containerHeight={600}
              renderItem={(ev) => {
                const t = normalizeType(ev.type);
                const label = t ? labelsByName[t] : undefined;
                const style = getLabelStyle(label);
                const pillClass = (label?.pill || '').trim();
                const pc = Number.isFinite(Number(ev.participantCount)) ? Number(ev.participantCount) : 0;
                const isSelected = selectedIds.has(ev.id);

                return (
                  <div
                    key={ev.id}
                    className="grid grid-cols-[32px_minmax(0,1.1fr)_160px_140px_110px_minmax(0,1fr)_120px] gap-3 px-4 py-3 text-xs border-b border-app-border hover:bg-app-accent-soft/30 transition-colors"
                    style={isSelected ? { background: 'rgba(99,102,241,0.06)' } : undefined}
                  >
                    <div className="flex items-center">
                      <button type="button" onClick={() => toggleOne(ev.id)} className="flex items-center justify-center">
                        {isSelected
                          ? <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                          : <Square className="h-3.5 w-3.5 text-app-muted opacity-40 hover:opacity-100 transition-opacity" />}
                      </button>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-app-text">{ev.title}</div>
                    </div>
                    <div className="text-[11px] text-app-muted">
                      {new Date(ev.date).toLocaleString('tr-TR')}
                    </div>
                    <div className="flex items-start">
                      {t ? (
                        <span style={style} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pillClass}`}>{t}</span>
                      ) : (
                        <span className="text-[11px] text-app-muted">—</span>
                      )}
                    </div>
                    <div className="flex items-start text-[11px] text-app-text">
                      <span className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-base px-2 py-0.5">
                        <Users className="h-3.5 w-3.5 text-app-muted" />
                        <span className="font-semibold">{pc}</span>
                      </span>
                    </div>
                    <div className="min-w-0 text-[11px] text-app-muted" title={ev.description || ''}>
                      <span className="block truncate">{ev.description ? ev.description : '—'}</span>
                    </div>
                    <div className="flex items-start justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('focusEventId', String(ev.id));
                          params.set('focusDate', ev.date);
                          navigate(`/calendar?${params.toString()}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-base px-2.5 py-1.5 text-[11px] font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Düzenle</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!await confirm('Bu etkinliği silmek istediğinize emin misiniz?', { variant: 'danger' })) return;
                          try {
                            await cancelEvent(ev.id);
                            setEvents(prev => prev.filter(x => x.id !== ev.id));
                          } catch {
                            // eslint-disable-next-line no-alert
                            window.alert('Etkinlik silinemedi.');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 shadow-sm transition hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Sil</span>
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
