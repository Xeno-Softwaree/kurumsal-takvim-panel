import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, CalendarCheck, CalendarClock, CalendarDays,
  LayoutDashboard, LogOut, Moon, Search, Sun, Users, UserCheck, Activity,
  Mail, Menu, Tag, X, FileText, Timer, Package,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { getEvents } from '../api/events';
import { useSSENotifications } from '../hooks/useSSENotifications';
import { useTheme } from '../hooks/useTheme';

function cx(...classes: (string | boolean | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  color: string;          // accent color name (Tailwind)
  activeText: string;
  activeBg: string;
  activeBorder: string;
};

const mainNav: NavItem[] = [
  {
    to: '/', label: 'Dashboard', end: true,
    icon: <LayoutDashboard className="h-[15px] w-[15px]" />,
    color: 'blue',
    activeText:   'text-blue-400',
    activeBg:     'bg-blue-500/[0.12]',
    activeBorder: 'border-l-blue-400',
  },
  {
    to: '/calendar', label: 'Takvim',
    icon: <CalendarDays className="h-[15px] w-[15px]" />,
    color: 'indigo',
    activeText:   'text-indigo-400',
    activeBg:     'bg-indigo-500/[0.12]',
    activeBorder: 'border-l-indigo-400',
  },
  {
    to: '/active', label: 'Aktif Etkinlikler',
    icon: <CalendarCheck className="h-[15px] w-[15px]" />,
    color: 'emerald',
    activeText:   'text-emerald-400',
    activeBg:     'bg-emerald-500/[0.12]',
    activeBorder: 'border-l-emerald-400',
  },
  {
    to: '/past', label: 'Geçmiş Etkinlikler',
    icon: <CalendarClock className="h-[15px] w-[15px]" />,
    color: 'amber',
    activeText:   'text-amber-400',
    activeBg:     'bg-amber-500/[0.12]',
    activeBorder: 'border-l-amber-400',
  },
  {
    to: '/documents', label: 'Dökümanlar',
    icon: <FileText className="h-[15px] w-[15px]" />,
    color: 'fuchsia',
    activeText:   'text-fuchsia-400',
    activeBg:     'bg-fuchsia-500/[0.12]',
    activeBorder: 'border-l-fuchsia-400',
  },
  {
    to: '/notifications', label: 'Bildirimler',
    icon: <Bell className="h-[15px] w-[15px]" />,
    color: 'purple',
    activeText:   'text-purple-400',
    activeBg:     'bg-purple-500/[0.12]',
    activeBorder: 'border-l-purple-400',
  },
  {
    to: '/staff', label: 'Ekip',
    icon: <UserCheck className="h-[15px] w-[15px]" />,
    color: 'cyan',
    activeText:   'text-cyan-400',
    activeBg:     'bg-cyan-500/[0.12]',
    activeBorder: 'border-l-cyan-400',
  },
  {
    to: '/inventory', label: 'Stok',
    icon: <Package className="h-[15px] w-[15px]" />,
    color: 'orange',
    activeText:   'text-orange-400',
    activeBg:     'bg-orange-500/[0.12]',
    activeBorder: 'border-l-orange-400',
  },
];

const adminNav: NavItem[] = [
  {
    to: '/logs', label: 'Activity Logs',
    icon: <Activity className="h-[15px] w-[15px]" />,
    color: 'rose',
    activeText:   'text-rose-400',
    activeBg:     'bg-rose-500/[0.12]',
    activeBorder: 'border-l-rose-400',
  },
  {
    to: '/admins', label: 'Adminler',
    icon: <Users className="h-[15px] w-[15px]" />,
    color: 'sky',
    activeText:   'text-sky-400',
    activeBg:     'bg-sky-500/[0.12]',
    activeBorder: 'border-l-sky-400',
  },
  {
    to: '/mail-settings', label: 'Mail Ayarları',
    icon: <Mail className="h-[15px] w-[15px]" />,
    color: 'green',
    activeText:   'text-green-400',
    activeBg:     'bg-green-500/[0.12]',
    activeBorder: 'border-l-green-400',
  },
  {
    to: '/labels', label: 'Etiketler',
    icon: <Tag className="h-[15px] w-[15px]" />,
    color: 'violet',
    activeText:   'text-violet-400',
    activeBg:     'bg-violet-500/[0.12]',
    activeBorder: 'border-l-violet-400',
  },
  {
    to: '/reminders', label: 'Hatırlatıcılar',
    icon: <Timer className="h-[15px] w-[15px]" />,
    color: 'teal',
    activeText:   'text-teal-400',
    activeBg:     'bg-teal-500/[0.12]',
    activeBorder: 'border-l-teal-400',
  },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium',
          'border-l-2 transition-all duration-150',
          isActive
            ? `${item.activeBg} ${item.activeText} ${item.activeBorder}`
            : 'border-l-transparent text-[var(--app-text-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]',
        )
      }
    >
      <span className="shrink-0 transition-transform duration-150 group-hover:scale-110">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { admin, logout, token } = useAuth();
  const navigate = useNavigate();

  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // ── Real-time notifications via SSE (falls back to polling if SSE fails) ──
  const {
    notifications,
    unreadCount,
    sseConnected,
    markAllRead,
  } = useSSENotifications(token);

  const recentNotifications = useMemo(() => notifications, [notifications]);

  const [globalOpen, setGlobalOpen] = useState(false);
  const [globalQ, setGlobalQ] = useState('');
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState<
    { id: number; title: string; date: string; type?: string }[]
  >([]);

  const parsePayloadMessage = (raw: string | null, fallback: string) => {
    if (!raw) return fallback;
    try {
      const p = JSON.parse(raw) as { message?: string };
      return p.message || fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalOpen(true);
      }
      if (e.key === 'Escape') {
        setGlobalOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    async function loadGlobal() {
      if (!globalOpen || !token) return;
      setGlobalLoading(true);
      try {
        const data = await getEvents({ search: globalQ.trim() || undefined, limit: 30 });
        setGlobalResults(data || []);
      } finally {
        setGlobalLoading(false);
      }
    }
    const id = window.setTimeout(loadGlobal, 200);
    return () => window.clearTimeout(id);
  }, [globalOpen, globalQ, token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ── Sidebar ── */
  const sidebar = (
    <aside
      className="flex w-[220px] shrink-0 flex-col"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand */}
      <div
        className="flex h-14 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
          <img src="/logo.png" alt="logo" className="h-5 w-5 object-contain" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-700 text-[var(--app-text)] leading-tight">
            Tuzla Belediyesi
          </div>
          <div className="truncate text-[10px] text-[var(--app-text-muted)] leading-tight mt-0.5">
            AFAD Etkinlik Yönetimi
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {mainNav.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}

        {admin?.is_super_admin && (
          <>
            <div className="px-3 pt-4 pb-1.5">
              <span
                className="text-[10px] font-700 uppercase tracking-widest"
                style={{ color: 'var(--app-text-subtle)' }}
              >
                Yönetim
              </span>
            </div>
            {adminNav.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div
        className="px-3 py-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-700 text-blue-300 uppercase">
            {(admin?.email?.[0] ?? 'A')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-600 text-[var(--app-text)]">
              {admin?.email || '—'}
            </div>
            <div className="text-[10px] text-[var(--app-text-muted)]">
              {admin?.is_super_admin ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-1.5 text-[11px] font-600 text-rose-400 transition-all duration-150 hover:bg-rose-500/15 hover:border-rose-500/40"
        >
          <LogOut className="h-3 w-3" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--app-bg)', color: 'var(--app-text)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Menüyü kapat"
          />
          <div className="absolute left-0 top-0 h-full w-[220px] animate-slide-in-left">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
              aria-label="Kapat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header
          className="flex h-14 shrink-0 items-center justify-between px-4 md:px-5 z-50 backdrop-blur-md"
          style={{
            background: 'var(--header-bg)',
            borderBottom: '1px solid var(--card-border)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[var(--app-text-muted)] transition hover:bg-white/8 md:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-[13px] font-700 text-[var(--app-text)] leading-tight">
                Tuzla Belediyesi Afet İşleri ve Risk Yönetimi
              </h1>
              <p className="text-[10px] text-[var(--app-text-muted)]">
                Etkinlik Takip ve Yönetim Sistemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              type="button"
              onClick={() => setGlobalOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-[var(--app-text-muted)] transition hover:bg-white/7 hover:text-[var(--app-text)]"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Etkinlik ara</span>
              <kbd className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-600 bg-white/8 text-[var(--app-text-muted)]">⌃K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setGlobalOpen(true)}
              className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[var(--app-text-muted)] transition hover:bg-white/8"
              aria-label="Arama"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[var(--app-text-muted)] transition hover:bg-white/8 hover:text-[var(--app-text)]"
              aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
              title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />
              }
            </button>

            {/* Notification bell */}
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[var(--app-text-muted)] transition hover:bg-white/8"
              aria-label="Bildirimler"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-700 text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Notification dropdown */}
        {notifOpen && createPortal(
          <div className="fixed inset-0 z-[9998]">
            <button
              type="button"
              aria-label="Kapat"
              onClick={() => setNotifOpen(false)}
              className="absolute inset-0"
            />
            <div
              className="fixed right-4 top-[58px] z-[9999] w-[320px] overflow-hidden rounded-xl border animate-slide-up"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--card-border)' }}
              >
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-700 text-[var(--app-text)]">Bildirimler</div>
                  {/* SSE bağlantı göstergesi */}
                  <span
                    title={sseConnected ? 'Gerçek zamanlı bağlı' : 'Polling modu'}
                    className="flex h-1.5 w-1.5 rounded-full"
                    style={{ background: sseConnected ? '#34d399' : '#6b7a99' }}
                  />
                  {unreadCount > 0 && (
                    <div className="text-[11px] text-[var(--app-text-muted)]">{unreadCount} okunmamış</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-600 text-blue-400 transition hover:text-blue-300"
                  >
                    Tümünü oku
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                {recentNotifications.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-[var(--app-text-muted)]">Bildirim bulunmuyor.</div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition"
                      style={{
                        background: n.is_read ? 'transparent' : 'rgba(59,130,246,0.05)',
                        border: `1px solid ${n.is_read ? 'transparent' : 'rgba(59,130,246,0.15)'}`,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-500 text-[var(--app-text)] leading-snug">
                          {parsePayloadMessage(n.payload, n.action)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--app-text-muted)]">
                          {new Date(n.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid var(--card-border)' }} className="p-2">
                <button
                  type="button"
                  onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                  className="w-full rounded-lg px-3 py-2 text-center text-[12px] font-600 text-blue-400 transition hover:bg-blue-500/8"
                >
                  Tüm bildirimleri gör →
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6" style={{ background: 'var(--app-bg)' }}>
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global search modal */}
      {globalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-16 backdrop-blur-sm">
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border animate-slide-up"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-strong)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <Search className="h-4 w-4 shrink-0 text-[var(--app-text-muted)]" />
              <input
                value={globalQ}
                onChange={(e) => setGlobalQ(e.target.value)}
                autoFocus
                placeholder="Etkinliklerde ara…"
                className="flex-1 bg-transparent text-[13px] text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
              />
              <kbd
                onClick={() => setGlobalOpen(false)}
                className="cursor-pointer rounded px-2 py-1 text-[10px] font-600 bg-white/6 text-[var(--app-text-muted)] hover:bg-white/10 transition"
              >
                ESC
              </kbd>
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2 space-y-1">
              {globalLoading ? (
                <div className="py-6 text-center text-[11px] text-[var(--app-text-muted)]">Aranıyor…</div>
              ) : globalResults.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[var(--app-text-muted)]">
                  {globalQ ? 'Sonuç bulunamadı.' : 'Arama yapmak için yazın…'}
                </div>
              ) : (
                globalResults.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      setGlobalOpen(false);
                      setGlobalQ('');
                      navigate(
                        `/calendar?focusDate=${encodeURIComponent(ev.date)}&focusEventId=${encodeURIComponent(ev.id.toString())}`,
                      );
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <span className="min-w-0 truncate text-[13px] font-500 text-[var(--app-text)]">
                      {ev.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--app-text-muted)] font-mono">
                      {new Date(ev.date).toLocaleDateString('tr-TR')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
