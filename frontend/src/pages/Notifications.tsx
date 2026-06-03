import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '../api/notifications';

function parsePayload(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as any;
  } catch {
    return null;
  }
}

export default function Notifications() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const rows = useMemo(() => items, [items]);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [list, unread] = await Promise.all([
        getNotifications({ limit: 200 }),
        getUnreadNotificationCount(),
      ]);
      setItems(list || []);
      setUnreadCount(unread?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirimler alınamadı');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleMarkAll = async () => {
    if (!token) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirimler güncellenemedi');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOne = async (id: number) => {
    if (!token) return;
    try {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, is_read: 1 } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim güncellenemedi');
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border bg-app-card p-4 shadow-sm backdrop-blur-[10px] transition">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-app-text">Bildirimler</h2>
            <p className="mt-1 text-xs text-app-muted">
              Okunmamış: <span className="font-semibold text-app-text">{unreadCount}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            Tümünü Okundu Yap
          </button>
        </div>

        {loading ? <div className="mt-3 text-xs text-app-muted">Yükleniyor…</div> : null}
        {error ? (
          <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {rows.map((n) => {
            const payload = parsePayload(n.payload);
            const msg = payload?.message || n.action;
            const isRead = !!n.is_read;
            return (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-xs transition ${isRead
                    ? 'border-app-border bg-app-base/30 text-app-muted'
                    : 'border-indigo-500/30 bg-indigo-500/10 text-app-text'
                  }`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-app-text">{msg}</div>
                  <div className="mt-0.5 text-[11px] text-app-muted">
                    {new Date(n.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>

                {!isRead ? (
                  <button
                    type="button"
                    onClick={() => handleMarkOne(n.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-app-border bg-app-base px-2 py-1 text-[11px] font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Okundu
                  </button>
                ) : null}
              </div>
            );
          })}

          {rows.length === 0 && !loading ? (
            <div className="text-xs text-app-muted italic text-center py-4">Bildirim bulunmuyor.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
