import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, type DatesSetArg } from '@fullcalendar/core';
import type { DateSelectArg } from '@fullcalendar/core';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import {
  createEvent,
  getEvents,
  updateEvent,
  type EventDto,
} from '../api/events';
import { useLabels, getLabelStyle } from '../labels/LabelsContext';
import EventDrawer from '../components/EventDrawer';

// Re-use EventDto from api/events as local Event type
type Event = EventDto;

type EventFormState = {
  title: string;
  description: string;
  type: string;
  department: string;
  participantCount: number;
  dateLocal: string; // datetime-local input format
  recurrenceRule: string;
};

function toLocalInputValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalInputValue(value: string) {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString();
}

export default function CalendarPage() {
  const { token } = useAuth();
  const { labels, labelsByName } = useLabels();
  const location = useLocation();
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);
  const focusAppliedRef = useRef(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  // Drawer state (view/edit existing event)
  const [drawerEvent, setDrawerEvent] = useState<Event | null>(null);

  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [searchText, setSearchText] = useState('');

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const selectedAdminId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('adminId');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [location.search]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<EventFormState>({
    title: '',
    description: '',
    type: '',
    department: '',
    participantCount: 0,
    dateLocal: '',
    recurrenceRule: '',
  });

  const resetForm = () => {
    setFormState({
      title: '',
      description: '',
      type: '',
      department: '',
      participantCount: 0,
      dateLocal: '',
      recurrenceRule: '',
    });
  };

  const openCreateForDate = (dateIso: string) => {
    resetForm();
    setFormState((prev) => ({
      ...prev,
      dateLocal: toLocalInputValue(dateIso),
    }));
    setIsModalOpen(true);
  };

  const openCreate = () => {
    const nowIso = new Date().toISOString();
    openCreateForDate(nowIso);
  };

  // Open existing event in drawer
  const openEdit = (event: Event) => {
    setDrawerEvent(event);
  };

  const loadEvents = useCallback(async () => {
    if (!token) return;
    if (!range) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEvents({
        start: range.start,
        end: range.end,
        adminId: selectedAdminId || undefined,
        search: searchText.trim() || undefined,
      });
      setEvents(data || []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const url = err.config?.baseURL
          ? `${err.config.baseURL}${err.config.url || ''}`
          : err.config?.url;
        const apiMsg = (err.response?.data as any)?.error;
        setError(
          `Etkinlikler yüklenemedi$${status ? ` (HTTP ${status})` : ''}$${url ? `: ${url}` : ''}$${apiMsg ? ` | ${apiMsg}` : ''}`
            .replaceAll('$', ''),
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Etkinlikler yüklenirken bir hata oluştu',
        );
      }
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [range, searchText, selectedAdminId, token]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setRange({ start: arg.startStr, end: arg.endStr });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusDate = params.get('focusDate');
    const focusEventIdRaw = params.get('focusEventId');
    const focusEventId = focusEventIdRaw ? Number(focusEventIdRaw) : null;
    if (focusAppliedRef.current) return;
    if (!focusDate && !focusEventId) return;

    if (focusEventId && Number.isFinite(focusEventId)) {
      const ev = events.find((x) => x.id === focusEventId);
      if (!ev) return;
      openEdit(ev);
    }

    if (focusDate && calendarRef.current) {
      calendarRef.current.getApi().gotoDate(focusDate);
    }
    if (focusEventId && Number.isFinite(focusEventId)) {
      setHighlightedEventId(focusEventId);
      window.setTimeout(() => setHighlightedEventId(null), 6000);
    }

    focusAppliedRef.current = true;
    params.delete('focusDate');
    params.delete('focusEventId');
    const next = params.toString();
    navigate(next ? `/calendar?${next}` : '/calendar', { replace: true });
  }, [events, location.search, navigate]);

  const labelOptions = useMemo(() => {
    return (labels || [])
      .map((x) => (typeof x?.name === 'string' ? x.name.trim() : ''))
      .filter(Boolean);
  }, [labels]);

  const normalizeType = useCallback(
    (type?: string) => {
      if (!type) return '';
      const t = type.trim();
      if (!t) return '';
      if (labelOptions.includes(t)) return t;
      return t;
    },
    [labelOptions],
  );

  const calendarEvents = useMemo(() => {
    const rangeStart = range ? new Date(range.start) : null;
    const rangeEnd   = range ? new Date(range.end)   : null;

    function advanceDate(d: Date, rule: string) {
      switch (rule) {
        case 'daily':   d.setDate(d.getDate() + 1); break;
        case 'weekly':  d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
        default:        d.setFullYear(d.getFullYear() + 1000); // safety exit
      }
    }

    const result: Array<{
      id: string;
      title: string;
      start: string;
      color: string | undefined;
      extendedProps: { type?: string; baseId: number; isRecurring: boolean };
    }> = [];

    const filtered = events.filter((e) => showArchived ? true : e.status !== 'past' && e.status !== 'cancelled');

    for (const e of filtered) {
      const color = labelsByName[normalizeType(e.type)]?.color || undefined;

      if (!e.recurrence_rule || !rangeStart || !rangeEnd) {
        result.push({
          id: String(e.id),
          title: e.title,
          start: e.date,
          color,
          extendedProps: { type: e.type, baseId: e.id, isRecurring: false },
        });
        continue;
      }

      // Expand recurring: advance from base date until we reach rangeStart
      const current = new Date(e.date);
      let safety = 0;
      while (current < rangeStart && safety++ < 100_000) {
        advanceDate(current, e.recurrence_rule);
      }

      // Emit all occurrences within the visible range
      let count = 0;
      while (current < rangeEnd && count++ < 1000) {
        result.push({
          id: `${e.id}_${current.getTime()}`,
          title: e.title,
          start: new Date(current).toISOString(),
          color,
          extendedProps: { type: e.type, baseId: e.id, isRecurring: true },
        });
        advanceDate(current, e.recurrence_rule);
      }
    }

    return result;
  }, [events, labelsByName, normalizeType, showArchived, range]);

  const renderEventContent = useCallback(
    (arg: any) => {
      const t = (arg.event?.extendedProps?.type || '').trim();
      const label = t ? labelsByName[t] : undefined;
      const style = getLabelStyle(label);
      const pillClass = (label?.pill || '').trim();
      const mobileTitle =
        isMobile && arg.event?.title && String(arg.event.title).length > 14
          ? '•'
          : arg.event?.title;

      const isRecurring = arg.event?.extendedProps?.isRecurring;

      return (
        <div className="flex min-w-0 items-center gap-1.5">
          {t ? (
            <span
              style={style}
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${pillClass}`}
            >
              {t}
            </span>
          ) : null}
          <span
            title={arg.event?.title}
            className={
              isMobile
                ? 'min-w-0 truncate text-[10px] font-semibold'
                : 'min-w-0 truncate text-[11px] font-semibold'
            }
          >
            {mobileTitle}
          </span>
          {isRecurring && !isMobile && (
            <span className="shrink-0 opacity-60 text-[9px]" title="Tekrarlayan etkinlik">↻</span>
          )}
        </div>
      );
    },
    [isMobile, labelsByName],
  );

  const eventClassNames = useCallback(
    (arg: any) => {
      const id = Number(String(arg.event.id).split('_')[0]);
      if (highlightedEventId && id === highlightedEventId) {
        return [
          'ring-2',
          'ring-amber-400',
          'ring-offset-2',
          'ring-offset-slate-950',
        ];
      }
      return [];
    },
    [highlightedEventId],
  );

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return events
      .filter((e) => {
        const t = (e.title || '').toLowerCase();
        const d = (e.description || '').toLowerCase();
        return t.includes(q) || d.includes(q);
      })
      .slice(0, 8);
  }, [events, searchText]);

  const focusEvent = (ev: Event) => {
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(ev.date);
    setHighlightedEventId(ev.id);
    window.setTimeout(() => setHighlightedEventId(null), 6000);
  };

  const handleDateClick = (arg: DateClickArg) => {
    openCreateForDate(arg.date.toISOString());
  };

  const handleSelect = (arg: DateSelectArg) => {
    openCreateForDate(arg.start.toISOString());
  };

  const handleEventClick = (arg: EventClickArg) => {
    // Recurring occurrences have IDs like "123_timestamp"; extract base ID
    const baseId = Number(arg.event.id.split('_')[0]);
    const ev = events.find((e) => e.id === baseId);
    if (ev) openEdit(ev);
  };

  const handleEventDrop = async (info: any) => {
    if (!token) return;
    // Recurring event occurrences (id = "baseId_timestamp") cannot be rescheduled via drag
    if (String(info.event.id).includes('_')) {
      info.revert();
      return;
    }
    const id = Number(info.event.id);
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    try {
      await updateEvent(id, {
        title: ev.title,
        description: ev.description || undefined,
        type: ev.type || undefined,
        department: ev.department || undefined,
        participantCount: Number.isFinite(Number(ev.participantCount)) ? Number(ev.participantCount) : 0,
        date: info.event.start?.toISOString() || ev.date,
        status: ev.status,
      });
      await loadEvents();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Event drop update failed:', err);
      info.revert();
    }
  };

  // Create-only submit handler (edit is handled inside EventDrawer)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await createEvent({
        title: formState.title,
        description: formState.description || undefined,
        type: formState.type || undefined,
        department: formState.department || undefined,
        participantCount: Number.isFinite(Number(formState.participantCount)) ? Number(formState.participantCount) : 0,
        date: fromLocalInputValue(formState.dateLocal),
        status: 'upcoming',
        recurrence_rule: formState.recurrenceRule || null,
      });
      setIsModalOpen(false);
      resetForm();
      loadEvents().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etkinlik kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-app-text">
            1 Yıllık Takvim
          </h2>
          <p className="text-xs text-app-muted">
            Geçmiş etkinlikler arşiv olarak işaretlenir, gelecek etkinlikler
            düzenlenebilir.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedAdminId && (
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-xs font-medium text-app-text shadow-sm transition hover:bg-app-accent-soft sm:w-auto"
            >
              Filtreyi kaldır
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-xs font-medium text-app-text shadow-sm transition hover:bg-app-accent-soft sm:w-auto"
          >
            {showArchived ? 'Tümünü göster' : 'Sadece Arşiv'}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Yeni Etkinlik</span>
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-app-muted" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Başlık veya açıklamada ara…"
            className="block w-full rounded-xl border border-app-border bg-app-base py-2 pl-10 pr-3 text-xs text-app-text outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
          />

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-30 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-2xl">
              <ul className="max-h-64 overflow-auto p-1">
                {searchResults.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => focusEvent(ev)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs text-app-text transition hover:bg-app-accent-soft"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {ev.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-app-muted">
                        {new Date(ev.date).toLocaleDateString('tr-TR')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-app-border bg-app-base px-3 py-2 text-[11px]">
        <span className="text-app-muted">Etiketler:</span>
        {labelOptions.map((name) => {
          const label = labelsByName[name];
          const style = getLabelStyle(label);
          const pillClass = (label?.pill || '').trim();
          return (
            <span
              key={name}
              style={style}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${pillClass}`}
            >
              {name}
            </span>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-app-border bg-app-card p-3 shadow-sm backdrop-blur-[10px] transition">
        <div className="relative">
          {loading ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-app-base/40">
              <div className="flex items-center gap-2 text-xs text-app-text">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Etkinlikler yükleniyor…</span>
              </div>
            </div>
          ) : null}

          {hasFetched && !error && events.length === 0 ? (
            <div className="px-2 pb-2 text-xs text-app-muted">
              Henüz etkinlik bulunmuyor.
            </div>
          ) : null}

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            locale={trLocale}
            initialView={isMobile ? 'dayGridDay' : 'dayGridMonth'}
            height="auto"
            headerToolbar={
              isMobile
                ? {
                  left: 'prev,next',
                  center: 'title',
                  right: 'dayGridDay,dayGridWeek,dayGridMonth',
                }
                : {
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,dayGridWeek,dayGridDay,listWeek',
                }
            }
            events={calendarEvents}
            eventContent={renderEventContent}
            eventClassNames={eventClassNames}
            editable
            eventDrop={handleEventDrop}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
          />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-app-base/70 px-4 backdrop-blur-[10px] transition">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-5 shadow-2xl backdrop-blur-[10px] transition">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-app-text">
                  Yeni Etkinlik Oluştur
                </h3>
                <p className="text-[11px] text-app-muted">
                  Başlık, tarih ve isteğe bağlı açıklama/tür alanlarını
                  doldurun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-xs text-app-muted hover:text-app-text"
              >
                Kapat
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="event-title"
                  className="mb-1 block font-medium text-app-text"
                >
                  Başlık
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={formState.title}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, title: e.target.value }))
                  }
                  className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Etkinlik başlığı"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="event-date"
                    className="mb-1 block font-medium text-app-text"
                  >
                    Tarih ve Saat
                  </label>
                  <input
                    id="event-date"
                    type="datetime-local"
                    value={formState.dateLocal}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, dateLocal: e.target.value }))
                    }
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="event-type"
                    className="mb-1 block font-medium text-app-text"
                  >
                    Kategori
                  </label>
                  <select
                    id="event-type"
                    value={formState.type}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, type: e.target.value }))
                    }
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">Seçilmedi</option>
                    {labelOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="event-participant-count"
                  className="mb-1 block font-medium text-app-text"
                >
                  Katılımcı Sayısı
                </label>
                <input
                  id="event-participant-count"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={formState.participantCount}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = v === '' ? 0 : Number(v);
                    setFormState((s) => ({
                      ...s,
                      participantCount:
                        Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0,
                    }));
                  }}
                  className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="0"
                />
              </div>

              <div>
                <label
                  htmlFor="event-recurrence"
                  className="mb-1 block font-medium text-app-text"
                >
                  Tekrar
                </label>
                <select
                  id="event-recurrence"
                  value={formState.recurrenceRule}
                  onChange={(e) => setFormState((s) => ({ ...s, recurrenceRule: e.target.value }))}
                  className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">Tekrar Yok</option>
                  <option value="daily">Her Gün</option>
                  <option value="weekly">Her Hafta</option>
                  <option value="monthly">Her Ay</option>
                  <option value="yearly">Her Yıl</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="event-description"
                  className="mb-1 block font-medium text-app-text"
                >
                  Açıklama (opsiyonel)
                </label>
                <textarea
                  id="event-description"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((s) => ({
                      ...s,
                      description: e.target.value,
                    }))
                  }
                  rows={6}
                  className="block w-full resize-y rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Etkinlikle ilgili kısa notlar"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-[11px] font-medium text-app-text shadow-sm transition hover:opacity-80"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-[11px] font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Etkinlik Oluştur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event detail / edit drawer */}
      <EventDrawer
        event={drawerEvent}
        onClose={() => setDrawerEvent(null)}
        onSaved={(updated) => {
          setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
          setDrawerEvent(updated);
        }}
        onDeleted={(id) => {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          setDrawerEvent(null);
        }}
      />
    </div>
  );
}

