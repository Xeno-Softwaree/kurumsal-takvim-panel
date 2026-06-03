import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  X, Pencil, Trash2, Bell, Loader2, Calendar, Users,
  Tag, Building2, FileText, Clock, CheckCircle, AlertCircle,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { updateEvent, cancelEvent, type EventDto } from '../api/events';
import { sendEventReminder } from '../api/eventsReminders';
import { getAdminRecipients, type AdminRecipientDto } from '../api/adminRecipients';
import { getLabelStyle, useLabels } from '../labels/LabelsContext';

/* ── helpers ────────────────────────────────────────────────────────────── */
function toLocalInputValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string) {
  return v ? new Date(v).toISOString() : '';
}

function recurrenceLabel(rule: string | null | undefined) {
  switch (rule) {
    case 'daily':   return 'Her Gün';
    case 'weekly':  return 'Her Hafta';
    case 'monthly': return 'Her Ay';
    case 'yearly':  return 'Her Yıl';
    default:        return null;
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'upcoming': return { text: 'Yaklaşan',  color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' };
    case 'active':   return { text: 'Aktif',      color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' };
    case 'past':     return { text: 'Geçmiş',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',border: 'rgba(148,163,184,0.25)' };
    case 'cancelled':return { text: 'İptal',      color: '#fb7185', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.25)' };
    default:         return { text: s,            color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',border: 'rgba(148,163,184,0.25)' };
  }
}

/* ── types ──────────────────────────────────────────────────────────────── */
interface Props {
  event: EventDto | null;
  onClose: () => void;
  onSaved: (updated: EventDto) => void;
  onDeleted: (id: number) => void;
}

type Mode = 'view' | 'edit';

/* ── component ──────────────────────────────────────────────────────────── */
export default function EventDrawer({ event, onClose, onSaved, onDeleted }: Props) {
  const { labels, labelsByName } = useLabels();
  const labelOptions = (labels || [])
    .map((x) => (typeof x?.name === 'string' ? x.name.trim() : ''))
    .filter(Boolean);

  const [mode, setMode] = useState<Mode>('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reminder state
  const [recipients, setRecipients] = useState<AdminRecipientDto[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  // Edit form
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    department: '',
    participantCount: 0,
    dateLocal: '',
    recurrenceRule: '',
  });

  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset when event changes
  useEffect(() => {
    if (!event) return;
    setMode('view');
    setError(null);
    setConfirmDelete(false);
    setReminderOpen(false);
    setReminderMsg(null);
    setSelectedRecipientIds([]);
    setRecipients([]);
    setForm({
      title: event.title,
      description: event.description || '',
      type: event.type || '',
      department: event.department || '',
      participantCount: Number.isFinite(Number(event.participantCount)) ? Number(event.participantCount) : 0,
      dateLocal: toLocalInputValue(event.date),
      recurrenceRule: event.recurrence_rule || '',
    });
  }, [event?.id]);

  // Load recipients when reminder panel opens
  useEffect(() => {
    if (!reminderOpen || recipients.length > 0) return;
    setRecipientLoading(true);
    getAdminRecipients()
      .then((data) => setRecipients(data || []))
      .catch(() => setRecipients([]))
      .finally(() => setRecipientLoading(false));
  }, [reminderOpen]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!event) return null;

  const st = statusLabel(event.status);
  const labelObj = event.type ? labelsByName[event.type.trim()] : undefined;
  const labelStyle = getLabelStyle(labelObj);
  const pillClass = (labelObj?.pill || '').trim();

  /* ── save edit ── */
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEvent(event.id, {
        title: form.title,
        description: form.description || undefined,
        type: form.type || undefined,
        department: form.department || undefined,
        participantCount: form.participantCount,
        date: fromLocalInputValue(form.dateLocal),
        status: event.status,
        recurrence_rule: form.recurrenceRule || null,
      });
      onSaved(updated);
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await cancelEvent(event.id);
      onDeleted(event.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme sırasında hata oluştu');
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  /* ── send reminder ── */
  const handleSendReminder = async () => {
    if (selectedRecipientIds.length === 0) {
      setError('Lütfen alıcı seçin.');
      return;
    }
    setReminderSending(true);
    setReminderMsg(null);
    setError(null);
    try {
      await sendEventReminder(event.id, { adminIds: selectedRecipientIds });
      setReminderMsg('Hatırlatıcı başarıyla gönderildi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hatırlatıcı gönderilemedi');
    } finally {
      setReminderSending(false);
    }
  };

  /* ── render ── */
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] flex-col overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
            >
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-[14px] font-700 truncate" style={{ color: 'var(--app-text)' }}>
              {mode === 'view' ? 'Etkinlik Detayı' : 'Etkinliği Düzenle'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mode === 'view' && event.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-600 transition"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Düzenle
              </button>
            )}
            {mode === 'edit' && (
              <button
                type="button"
                onClick={() => { setMode('view'); setError(null); }}
                className="text-[12px] font-500 transition hover:opacity-80"
                style={{ color: 'var(--app-text-muted)' }}
              >
                Vazgeç
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/8"
              style={{ color: 'var(--app-text-muted)' }}
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'view' ? (
            <ViewMode
              event={event}
              st={st}
              labelStyle={labelStyle}
              pillClass={pillClass}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              handleDelete={handleDelete}
              saving={saving}
              reminderOpen={reminderOpen}
              setReminderOpen={setReminderOpen}
              recipientLoading={recipientLoading}
              recipients={recipients}
              selectedRecipientIds={selectedRecipientIds}
              setSelectedRecipientIds={setSelectedRecipientIds}
              reminderSending={reminderSending}
              handleSendReminder={handleSendReminder}
              reminderMsg={reminderMsg}
              error={error}
            />
          ) : (
            <EditMode
              form={form}
              setForm={setForm}
              labelOptions={labelOptions}
              handleSave={handleSave}
              saving={saving}
              error={error}
              onCancel={() => { setMode('view'); setError(null); }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── VIEW MODE ──────────────────────────────────────────────────────────── */
function ViewMode({
  event, st, labelStyle, pillClass,
  confirmDelete, setConfirmDelete, handleDelete, saving,
  reminderOpen, setReminderOpen,
  recipientLoading, recipients, selectedRecipientIds, setSelectedRecipientIds,
  reminderSending, handleSendReminder, reminderMsg, error,
}: any) {
  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0" style={{ color: 'var(--app-text-muted)' }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-600 uppercase tracking-wider mb-0.5" style={{ color: 'var(--app-text-muted)' }}>{label}</div>
        <div className="text-[13px] font-500 break-words" style={{ color: 'var(--app-text)' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Title + status hero */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[17px] font-700 leading-snug" style={{ color: 'var(--app-text)' }}>
            {event.title}
          </h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-600"
            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
          >
            {st.text}
          </span>
        </div>
        {event.type && (
          <span
            style={labelStyle}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-600 ${pillClass}`}
          >
            {event.type}
          </span>
        )}
      </div>

      {/* Details grid */}
      <div className="px-5 py-5 space-y-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <Row
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Tarih ve Saat"
          value={new Date(event.date).toLocaleString('tr-TR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        />
        {event.department && (
          <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Departman" value={event.department} />
        )}
        <Row
          icon={<Users className="h-3.5 w-3.5" />}
          label="Katılımcı Sayısı"
          value={
            <span className="font-700 text-[15px]" style={{ color: 'var(--app-text)' }}>
              {Number(event.participantCount) || 0}
            </span>
          }
        />
        {recurrenceLabel(event.recurrence_rule) && (
          <Row
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            label="Tekrar"
            value={recurrenceLabel(event.recurrence_rule)!}
          />
        )}
        {event.admin_email && (
          <Row icon={<Tag className="h-3.5 w-3.5" />} label="Oluşturan" value={event.admin_email} />
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--app-text-muted)' }} />
            <span className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Açıklama</span>
          </div>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--app-text)' }}>
            {event.description}
          </p>
        </div>
      )}

      {/* Reminder section */}
      {event.status !== 'cancelled' && event.status !== 'past' && (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <button
            type="button"
            onClick={() => setReminderOpen((v: boolean) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[12px] font-600 text-indigo-400">Hatırlatıcı Gönder</span>
            </div>
            <ChevronRight
              className="h-4 w-4 text-indigo-400 transition-transform duration-200"
              style={{ transform: reminderOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>

          {reminderOpen && (
            <div className="mt-3 space-y-3">
              {recipientLoading ? (
                <div className="text-[11px] py-2" style={{ color: 'var(--app-text-muted)' }}>Alıcılar yükleniyor…</div>
              ) : recipients.length === 0 ? (
                <div className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>Alıcı bulunamadı.</div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRecipientIds(recipients.map((r: AdminRecipientDto) => r.id))}
                      className="rounded-md px-2.5 py-1 text-[11px] font-500 transition hover:opacity-80"
                      style={{ background: 'var(--app-bg)', border: '1px solid var(--card-border)', color: 'var(--app-text)' }}
                    >
                      Tümünü seç
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipientIds([])}
                      className="rounded-md px-2.5 py-1 text-[11px] font-500 transition hover:opacity-80"
                      style={{ background: 'var(--app-bg)', border: '1px solid var(--card-border)', color: 'var(--app-text-muted)' }}
                    >
                      Temizle
                    </button>
                  </div>
                  <div
                    className="rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto"
                    style={{ background: 'var(--app-bg)', border: '1px solid var(--card-border)' }}
                  >
                    {recipients.map((r: AdminRecipientDto) => (
                      <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-white/4">
                        <input
                          type="checkbox"
                          checked={selectedRecipientIds.includes(r.id)}
                          onChange={(e) => setSelectedRecipientIds((prev: number[]) =>
                            e.target.checked ? [...prev, r.id] : prev.filter((id: number) => id !== r.id)
                          )}
                          className="accent-indigo-500"
                        />
                        <span className="truncate text-[11px]" style={{ color: 'var(--app-text)' }}>{r.email}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSendReminder}
                    disabled={reminderSending || selectedRecipientIds.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-600 text-white transition disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}
                  >
                    {reminderSending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {reminderSending ? 'Gönderiliyor…' : `Gönder (${selectedRecipientIds.length} kişi)`}
                  </button>
                </>
              )}
              {reminderMsg && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-500"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  {reminderMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mx-5 mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-500"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Delete zone */}
      {event.status !== 'cancelled' && (
        <div className="px-5 py-5">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-600 transition hover:opacity-90"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Etkinliği İptal Et
            </button>
          ) : (
            <div
              className="space-y-3 rounded-xl p-4"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
            >
              <p className="text-[12px] font-600" style={{ color: '#fda4af' }}>
                Bu etkinliği iptal etmek istediğinize emin misiniz?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-700 text-white transition disabled:opacity-60"
                  style={{ background: '#dc2626' }}
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Evet, İptal Et
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-600 transition hover:bg-white/6"
                  style={{ color: 'var(--app-text-muted)', border: '1px solid var(--card-border)' }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── EDIT MODE ──────────────────────────────────────────────────────────── */
function EditMode({ form, setForm, labelOptions, handleSave, saving, error, onCancel }: any) {
  const inputClass = `
    block w-full rounded-lg py-2.5 px-3 text-[13px] outline-none transition-all duration-150
    focus:ring-2
  `;
  const inputStyle = {
    background: 'var(--app-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--app-text)',
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-700 uppercase tracking-wider mb-1.5" style={{ color: 'var(--app-text-muted)' }}>
      {children}
    </label>
  );

  return (
    <form onSubmit={handleSave} className="px-5 py-5 space-y-4">
      <div>
        <Label>Başlık *</Label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((s: any) => ({ ...s, title: e.target.value }))}
          className={inputClass}
          style={inputStyle}
          required
          placeholder="Etkinlik başlığı"
          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tarih ve Saat *</Label>
          <input
            type="datetime-local"
            value={form.dateLocal}
            onChange={(e) => setForm((s: any) => ({ ...s, dateLocal: e.target.value }))}
            className={inputClass}
            style={inputStyle}
            required
            onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <Label>Katılımcı Sayısı</Label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.participantCount}
            onChange={(e) => {
              const n = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value)));
              setForm((s: any) => ({ ...s, participantCount: Number.isFinite(n) ? n : 0 }));
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="0"
            onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kategori</Label>
          <select
            value={form.type}
            onChange={(e) => setForm((s: any) => ({ ...s, type: e.target.value }))}
            className={inputClass}
            style={inputStyle}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)'; }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--card-border)'; }}
          >
            <option value="">Seçilmedi</option>
            {labelOptions.map((name: string) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Departman</Label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => setForm((s: any) => ({ ...s, department: e.target.value }))}
            className={inputClass}
            style={inputStyle}
            placeholder="Opsiyonel"
            onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div>
        <Label>Tekrar</Label>
        <select
          value={form.recurrenceRule}
          onChange={(e) => setForm((s: any) => ({ ...s, recurrenceRule: e.target.value }))}
          className={inputClass}
          style={inputStyle}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)'; }}
          onBlur={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--card-border)'; }}
        >
          <option value="">Tekrar Yok</option>
          <option value="daily">Her Gün</option>
          <option value="weekly">Her Hafta</option>
          <option value="monthly">Her Ay</option>
          <option value="yearly">Her Yıl</option>
        </select>
      </div>

      <div>
        <Label>Açıklama</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((s: any) => ({ ...s, description: e.target.value }))}
          rows={5}
          className={`${inputClass} resize-y`}
          style={inputStyle}
          placeholder="Etkinlikle ilgili notlar…"
          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--card-border)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {error && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-500"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-[12px] font-600 transition hover:bg-white/5"
          style={{ color: 'var(--app-text-muted)', border: '1px solid var(--card-border)' }}
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-700 text-white transition disabled:opacity-60"
          style={{ background: 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.4)' }}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Değişiklikleri Kaydet
        </button>
      </div>
    </form>
  );
}
