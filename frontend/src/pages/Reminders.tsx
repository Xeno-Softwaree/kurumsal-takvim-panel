import { useCallback, useEffect, useState } from 'react';
import {
  Bell, CheckCircle2, Clock, RefreshCw, Timer,
  CalendarDays, Loader2, Activity, Info,
} from 'lucide-react';
import { getUpcomingReminders, getReminderHistory, type UpcomingReminder, type ReminderHistory } from '../api/reminders';

const STAGE_LABELS: Record<string, string> = {
  '1h':  '1 saat önce',
  '2h':  '2 saat önce',
  '24h': '24 saat önce',
  '72h': '3 gün önce',
};

const STAGE_COLOR: Record<string, { bg: string; color: string }> = {
  '1h':  { bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
  '2h':  { bg: 'rgba(249,115,22,0.1)',  color: '#fb923c' },
  '24h': { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa' },
  '72h': { bg: 'rgba(139,92,246,0.1)', color: '#c084fc' },
};

const TYPE_STAGES: Record<string, string[]> = {
  'Toplantı': ['24h', '2h', '1h'],
  'Görev':    ['72h', '24h', '2h'],
  'Önemli':   ['24h', '2h', '1h'],
  default:    ['24h', '2h'],
};

function getExpectedStages(type: string | null): string[] {
  return TYPE_STAGES[type || ''] ?? TYPE_STAGES.default;
}

function StagePill({ stage, delivered }: { stage: string; delivered: boolean }) {
  const c = STAGE_COLOR[stage] ?? { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-700"
      style={{
        background: delivered ? c.bg : 'var(--app-bg)',
        color: delivered ? c.color : 'var(--app-text-subtle)',
        border: `1px solid ${delivered ? c.color + '40' : 'var(--card-border)'}`,
        opacity: delivered ? 1 : 0.5,
        textDecoration: delivered ? 'none' : 'line-through',
      }}
    >
      {delivered && <CheckCircle2 className="h-2.5 w-2.5" />}
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

export default function Reminders() {
  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([]);
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, h] = await Promise.all([getUpcomingReminders(), getReminderHistory()]);
      setUpcoming(u);
      setHistory(h);
    } catch {
      setUpcoming([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-700" style={{ color: 'var(--app-text)' }}>Otomatik Hatırlatıcılar</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
            Scheduler her 5 dakikada çalışır — yaklaşan etkinliklere otomatik e-posta gönderir
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-600 transition hover:opacity-80"
          style={{ color: 'var(--app-text-muted)', border: '1px solid var(--card-border)', background: 'var(--app-bg)' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Status + Rules row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Scheduler status */}
        <div
          className="flex items-center gap-4 rounded-xl p-4"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-700" style={{ color: 'var(--app-text)' }}>
                Scheduler Aktif
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
              Her 5 dakikada çalışır · Her gün 09:00'da günlük özet gönderir
            </p>
          </div>
        </div>

        {/* Info card */}
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--app-text-muted)' }} />
          <div className="space-y-1.5">
            <p className="text-[11px] font-700" style={{ color: 'var(--app-text)' }}>Hatırlatıcı Kuralları</p>
            {[
              { label: 'Toplantı & Önemli', stages: '24 saat · 2 saat · 1 saat önce' },
              { label: 'Görev',             stages: '3 gün · 24 saat · 2 saat önce' },
              { label: 'Diğer etkinlikler', stages: '24 saat · 2 saat önce' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-[11px]">
                <span className="font-600 w-36 shrink-0" style={{ color: 'var(--app-text)' }}>{r.label}</span>
                <span style={{ color: 'var(--app-text-muted)' }}>{r.stages}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming reminders */}
      <div>
        <h2 className="text-[12px] font-700 uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: 'var(--app-text-muted)' }}>
          <Clock className="h-3.5 w-3.5" />
          Önümüzdeki 72 Saatteki Etkinlikler
          {!loading && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-700"
              style={{ background: 'var(--card-bg)', color: 'var(--app-text)', border: '1px solid var(--card-border)' }}
            >
              {upcoming.length}
            </span>
          )}
        </h2>

        <div
          className="overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--app-text-muted)' }} />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2"
              style={{ color: 'var(--app-text-muted)' }}>
              <CalendarDays className="h-8 w-8 opacity-20" />
              <p className="text-[12px]">Önümüzdeki 72 saatte etkinlik yok</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Etkinlik', 'Tarih', 'Tür', 'Hatırlatıcı Durumu'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-700 uppercase tracking-wider"
                      style={{ color: 'var(--app-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((ev) => {
                  const expected = getExpectedStages(ev.type);
                  const msLeft = new Date(ev.date).getTime() - Date.now();
                  const hoursLeft = msLeft / 3600000;
                  return (
                    <tr
                      key={ev.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: '1px solid var(--card-border)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[12px] font-600" style={{ color: 'var(--app-text)' }}>
                            {ev.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px]" style={{ color: 'var(--app-text)' }}>
                          {new Date(ev.date).toLocaleString('tr-TR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                          {hoursLeft < 1
                            ? `${Math.round(hoursLeft * 60)} dk sonra`
                            : `${hoursLeft.toFixed(1)} saat sonra`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-600"
                          style={{
                            background: 'var(--app-bg)',
                            color: 'var(--app-text-muted)',
                            border: '1px solid var(--card-border)',
                          }}
                        >
                          {ev.type || 'Genel'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {expected.map((stage) => (
                            <StagePill
                              key={stage}
                              stage={stage}
                              delivered={ev.deliveredStages.includes(stage)}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delivery history */}
      <div>
        <h2 className="text-[12px] font-700 uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: 'var(--app-text-muted)' }}>
          <Timer className="h-3.5 w-3.5" />
          Son Gönderimler
        </h2>

        <div
          className="overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--app-text-muted)' }} />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2"
              style={{ color: 'var(--app-text-muted)' }}>
              <Bell className="h-8 w-8 opacity-20" />
              <p className="text-[12px]">Henüz hatırlatıcı gönderilmedi</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Etkinlik', 'Etkinlik Tarihi', 'Aşama', 'Gönderilme Zamanı'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-700 uppercase tracking-wider"
                      style={{ color: 'var(--app-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const c = STAGE_COLOR[h.stage] ?? { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' };
                  return (
                    <tr
                      key={h.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: '1px solid var(--card-border)' }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-600" style={{ color: 'var(--app-text)' }}>
                          {h.event_title || `#${h.event_id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                        {h.event_date
                          ? new Date(h.event_date).toLocaleString('tr-TR', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-700"
                          style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}40` }}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {STAGE_LABELS[h.stage] ?? h.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                        {new Date(h.delivered_at).toLocaleString('tr-TR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
