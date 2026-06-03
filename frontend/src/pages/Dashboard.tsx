import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getStats } from '../api/stats';
import { getEvents } from '../api/events';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays, Zap, Clock, CheckCircle,
  TrendingUp, TrendingDown, Users, Cloud, GripVertical,
} from 'lucide-react';

type Stats = {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  weekMeetings: number;
  activeAdmins: number;
  trends?: {
    total: any;
    active: any;
    upcoming: any;
    past: any;
    events?: number;
  };
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const WIDGET_ORDER_KEY = 'ktakvim-dashboard-widget-order';
const DEFAULT_ORDER = ['upcoming', 'pie', 'bar', 'line'];

/* ─── Skeleton primitives ─────────────────────────── */
function Sk({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
    >
      <Sk className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Sk className="h-3 w-20 rounded" />
        <Sk className="h-6 w-14 rounded" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <Sk className="h-4 w-36 rounded" />
      <Sk className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────── */
type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: { value: string; isPositive: boolean } | null;
  color: 'blue' | 'green' | 'amber' | 'rose';
};

const colorMap = {
  blue:  { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  icon: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  green: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  amber: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
  rose:  { bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',   icon: 'rgba(244,63,94,0.15)',   text: '#fb7185' },
};

function StatCard({ title, value, icon, trend, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-600 uppercase tracking-wider" style={{ color: c.text }}>
            {title}
          </div>
          <div className="mt-2 text-2xl font-800 stat-number" style={{ color: 'var(--app-text)' }}>
            {value.toLocaleString('tr-TR')}
          </div>
          {trend && (
            <div className={`mt-1.5 flex items-center gap-1 text-[11px] font-500 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.icon, color: c.text }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─── Tooltip style ─────────────────────────────── */
const tooltipStyle = {
  contentStyle: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-strong)',
    borderRadius: '10px',
    fontSize: '11px',
    color: 'var(--app-text)',
    boxShadow: 'var(--shadow-md)',
    fontFamily: 'Outfit, sans-serif',
  },
  cursor: { fill: 'rgba(59,130,246,0.06)' },
};

/* ─── Draggable Widget Wrapper ───────────────────── */
function DraggableWidget({
  id,
  dragId,
  dragOverId,
  onDragStart,
  onDragEnter,
  onDragEnd,
  children,
}: {
  id: string;
  dragId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) {
  const isDragging = dragId === id;
  const isOver = dragOverId === id && dragId !== id;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragEnter={() => onDragEnter(id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      style={{
        opacity: isDragging ? 0.4 : 1,
        outline: isOver ? '2px dashed rgba(99,102,241,0.5)' : undefined,
        outlineOffset: isOver ? '2px' : undefined,
        borderRadius: 12,
        transition: 'opacity 0.15s, outline 0.1s',
        cursor: 'grab',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '12m'>('12m');

  // Widget order (drag-and-drop)
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WIDGET_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) return parsed;
      }
    } catch {}
    return DEFAULT_ORDER;
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragEnter = (id: string) => setDragOverId(id);
  const handleDragEnd = () => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      setWidgetOrder((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(dragId);
        const toIdx = next.indexOf(dragOverId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, dragId);
        localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(next));
        return next;
      });
    }
    setDragId(null);
    setDragOverId(null);
  };

  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const statsData = await getStats();
        setStats(statsData as any);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!token) return;
      try {
        const upcoming = await getEvents({ status: 'future', limit: 5 });
        setUpcomingEvents(upcoming || []);

        const data = await getEvents({ limit: 1000 });
        const events = data || [];

        const typeTotals: Record<string, number> = {};
        let totalParticipantsAll = 0;
        events.forEach((event) => {
          const type = event.type || 'Belirtilmemiş';
          const pc = Number.isFinite(Number(event.participantCount)) ? Number(event.participantCount) : 0;
          typeTotals[type] = (typeTotals[type] || 0) + pc;
          totalParticipantsAll += pc;
        });
        const typeChartData = Object.entries(typeTotals).map(([type, sum]) => ({
          name: type,
          value: sum,
          percentage: totalParticipantsAll > 0 ? Math.round((sum / totalParticipantsAll) * 100) : 0,
        }));

        const monthStats: Record<string, number> = {};
        events.forEach((event) => {
          try {
            const date = new Date(event.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthStats[key] = (monthStats[key] || 0) + 1;
          } catch {}
        });
        const monthChartData = Object.entries(monthStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, count]) => ({
            month: monthNames[parseInt(month.substring(5)) - 1] || month.substring(5),
            count,
          }));

        const participantStats: Record<string, number> = {};
        events.forEach((event) => {
          try {
            const date = new Date(event.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            participantStats[key] = (participantStats[key] || 0) + Number(event.participantCount || 0);
          } catch {}
        });
        const participantChartData = Object.entries(participantStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, total]) => ({
            month: monthNames[parseInt(month.substring(5)) - 1] || month.substring(5),
            participants: total,
          }));

        setMonthlyData(monthChartData);
        setChartData(participantChartData);
        setTypeData(typeChartData);
      } catch (error) {
        console.error('Chart data error:', error);
      }
    }
    loadDashboardData();
  }, [token, dateRange]);

  /* ── Widget renderers ── */
  function renderWidget(id: string) {
    switch (id) {
      case 'upcoming':
        return (
          <DraggableWidget key={id} id={id} dragId={dragId} dragOverId={dragOverId} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}>
            <div className="rounded-xl h-full" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: 'var(--app-text-muted)' }} />
                  <h2 className="text-[13px] font-700" style={{ color: 'var(--app-text)' }}>Yaklaşan Etkinlikler</h2>
                </div>
                <GripVertical className="h-4 w-4 opacity-30" style={{ color: 'var(--app-text-muted)' }} />
              </div>
              <div className="p-3 space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Sk className="h-10 w-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Sk className="h-3 w-3/4 rounded" />
                        <Sk className="h-2.5 w-1/2 rounded" />
                      </div>
                    </div>
                  ))
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 rounded-lg p-3 transition-all duration-150 hover:bg-white/4 cursor-default">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-center" style={{ background: 'var(--app-bg)', border: '1px solid var(--card-border)' }}>
                        <span className="text-[9px] font-700 uppercase leading-none" style={{ color: 'var(--app-text-muted)' }}>
                          {new Date(ev.date).toLocaleString('tr-TR', { month: 'short' })}
                        </span>
                        <span className="text-[15px] font-800 leading-none mt-0.5" style={{ color: 'var(--app-text)' }}>
                          {new Date(ev.date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-600" style={{ color: 'var(--app-text)' }}>{ev.title}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: 'var(--app-text-muted)' }}>
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(ev.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[11px] italic" style={{ color: 'var(--app-text-muted)' }}>
                    Yaklaşan etkinlik bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </DraggableWidget>
        );

      case 'pie':
        return (
          <DraggableWidget key={id} id={id} dragId={dragId} dragOverId={dragOverId} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}>
            <div className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-700" style={{ color: 'var(--app-text)' }}>Etkinlik Dağılımı</h2>
                <GripVertical className="h-4 w-4 opacity-30" style={{ color: 'var(--app-text-muted)' }} />
              </div>
              {loading ? <ChartSkeleton height={220} /> : (
                <div className="h-56">
                  {typeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={typeData} cx="50%" cy="48%" labelLine={false} label={({ percentage }) => percentage > 5 ? `%${percentage}` : ''} outerRadius={75} dataKey="value">
                          {typeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', fontFamily: 'Outfit, sans-serif' }} iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] italic" style={{ color: 'var(--app-text-muted)' }}>Veri bulunamadı</div>
                  )}
                </div>
              )}
            </div>
          </DraggableWidget>
        );

      case 'bar':
        return (
          <DraggableWidget key={id} id={id} dragId={dragId} dragOverId={dragOverId} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}>
            <div className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-700" style={{ color: 'var(--app-text)' }}>Aylık Etkinlik Sayısı</h2>
                <GripVertical className="h-4 w-4 opacity-30" style={{ color: 'var(--app-text-muted)' }} />
              </div>
              {loading ? <ChartSkeleton height={220} /> : (
                <div className="h-56">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" stroke="var(--app-text-muted)" fontSize={10} axisLine={false} tickLine={false} fontFamily="Outfit, sans-serif" />
                        <YAxis stroke="var(--app-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={28} fontFamily="Outfit, sans-serif" />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[5, 5, 0, 0]} barSize={18} label={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, position: 'top', fontFamily: 'Outfit' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] italic" style={{ color: 'var(--app-text-muted)' }}>Veri bulunamadı</div>
                  )}
                </div>
              )}
            </div>
          </DraggableWidget>
        );

      case 'line':
        return (
          <DraggableWidget key={id} id={id} dragId={dragId} dragOverId={dragOverId} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd}>
            <div className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-700" style={{ color: 'var(--app-text)' }}>Katılımcı Analizi</h2>
                <GripVertical className="h-4 w-4 opacity-30" style={{ color: 'var(--app-text-muted)' }} />
              </div>
              {loading ? <ChartSkeleton height={180} /> : (
                <div className="h-52">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" stroke="var(--app-text-muted)" fontSize={10} axisLine={false} tickLine={false} fontFamily="Outfit, sans-serif" />
                        <YAxis stroke="var(--app-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={32} fontFamily="Outfit, sans-serif" />
                        <Tooltip {...tooltipStyle} />
                        <Line type="monotone" dataKey="participants" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] italic" style={{ color: 'var(--app-text-muted)' }}>Veri bulunamadı</div>
                  )}
                </div>
              )}
            </div>
          </DraggableWidget>
        );

      default:
        return null;
    }
  }

  // Split order into layout: first widget gets col-span-4, next two get col-span-4 each (2-col row), last gets full width
  const [w0, w1, w2, w3] = widgetOrder;

  /* ── Render ── */
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-800 uppercase tracking-wide" style={{ color: 'var(--app-text)' }}>
            Panel Özeti
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
            Genel durum ve istatistikler · <span style={{ color: 'var(--app-text-subtle)' }}>Widgetları sürükleyerek yeniden sıralayabilirsiniz</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <span className="text-[10px] font-700 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Periyot:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-transparent text-[12px] font-600 border-none focus:ring-0 outline-none cursor-pointer"
              style={{ color: 'var(--app-text)' }}
            >
              <option value="3m">Son 3 Ay</option>
              <option value="6m">Son 6 Ay</option>
              <option value="12m">Son 1 Yıl</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(WIDGET_ORDER_KEY);
              setWidgetOrder([...DEFAULT_ORDER]);
            }}
            className="rounded-lg px-3 py-1.5 text-[10px] font-600 transition hover:opacity-80"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--app-text-muted)' }}
            title="Sıralamayı sıfırla"
          >
            Sıfırla
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Toplam Etkinlik" value={stats?.totalEvents || 0} icon={<CalendarDays className="h-5 w-5" />} trend={stats?.trends?.total} color="blue" />
          <StatCard title="Aktif Etkinlik"  value={stats?.activeEvents || 0}  icon={<Zap className="h-5 w-5" />}         trend={stats?.trends?.active}   color="green" />
          <StatCard title="Yaklaşan"        value={stats?.upcomingEvents || 0} icon={<Clock className="h-5 w-5" />}       trend={stats?.trends?.upcoming} color="amber" />
          <StatCard title="Tamamlanan"      value={stats?.pastEvents || 0}     icon={<CheckCircle className="h-5 w-5" />} trend={stats?.trends?.past}     color="rose" />
        </div>
      )}

      {/* Secondary info row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/15">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] font-700 uppercase tracking-wider text-indigo-400">Haftalık</div>
            {loading ? <Sk className="h-5 w-20 rounded mt-1" /> : <div className="text-[15px] font-700" style={{ color: 'var(--app-text)' }}>{stats?.weekMeetings || 0} Toplantı</div>}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/15">
            <Users className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <div className="text-[10px] font-700 uppercase tracking-wider text-violet-400">Aktif</div>
            {loading ? <Sk className="h-5 w-16 rounded mt-1" /> : <div className="text-[15px] font-700" style={{ color: 'var(--app-text)' }}>{stats?.activeAdmins || 0} Admin</div>}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/15">
            <Cloud className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-700 uppercase tracking-wider text-amber-400">Tuzla Hava</div>
            <div className="text-[15px] font-700" style={{ color: 'var(--app-text)' }}>14°C Parçalı Bulutlu</div>
          </div>
        </div>
      </div>

      {/* Draggable main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column — first widget */}
        <div className="lg:col-span-4">
          {renderWidget(w0)}
        </div>

        {/* Right column — remaining widgets */}
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {renderWidget(w1)}
            {renderWidget(w2)}
          </div>
          {renderWidget(w3)}
        </div>
      </div>
    </div>
  );
}
