import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getActivityLogs, type ActivityLogDto } from '../api/activityLogs';

function formatEntity(log: ActivityLogDto) {
  if (!log.entity_type) return '—';
  if (log.entity_id == null) return log.entity_type;
  return `${log.entity_type} #${log.entity_id}`;
}

function formatAction(log: ActivityLogDto) {
  if (!log.meta) return log.action;
  try {
    const parsed = JSON.parse(log.meta) as { message?: string };
    return parsed.message || log.action;
  } catch {
    return log.action;
  }
}

export default function ActivityLogs() {
  const { token, admin } = useAuth();
  const [logs, setLogs] = useState<ActivityLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);
  const [hasMore, setHasMore] = useState(true);

  const isAllowed = !!admin?.is_super_admin;

  useEffect(() => {
    async function load() {
      if (!token) return;
      if (!isAllowed) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getActivityLogs({ limit: limit });
        const normalizedData = data || [];
        setLogs(normalizedData);
        setHasMore(normalizedData.length === limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Loglar alınamadı');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAllowed, token, limit]);

  const rows = useMemo(() => logs, [logs]);

  if (!isAllowed) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        Yetkisiz Erişim
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-app-text">Activity Logs</h2>
        <p className="mt-1 text-xs text-app-muted">
          Sistem hareketleri (en yeni en üstte)
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm backdrop-blur-[10px] transition">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-app-base text-app-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Kim</th>
                <th className="px-4 py-3 font-semibold">Ne yaptı</th>
                <th className="px-4 py-3 font-semibold">Nerede</th>
                <th className="px-4 py-3 font-semibold">Ne zaman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-app-muted">
                    Yükleniyor…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-app-muted italic text-center">
                    Henüz log bulunmuyor.
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
                  <tr key={log.id} className="hover:bg-app-base/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-app-text">
                      {log.admin_email || 'Sistem'}
                    </td>
                    <td className="min-w-[280px] px-4 py-3 text-app-text">
                      {formatAction(log)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-app-muted">
                      {formatEntity(log)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-app-muted">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center p-4">
          <button
            type="button"
            onClick={() => setLimit(prev => prev + 200)}
            disabled={loading}
            className="rounded-xl border border-app-border bg-app-base px-6 py-2 text-xs font-bold text-app-text transition-colors hover:bg-app-accent-soft disabled:opacity-50"
          >
            {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
          </button>
        </div>
      )}
    </div>
  );
}
