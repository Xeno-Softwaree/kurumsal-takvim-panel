import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, Eye, EyeOff, FileText, Lock, Mail, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const FEATURES = [
  { Icon: FileText, label: 'Etkinlik ve takvim yönetimi' },
  { Icon: Users,    label: 'Personel ve ekip takibi'    },
  { Icon: Bell,     label: 'Hatırlatıcı ve bildirimler' },
  { Icon: ShieldCheck, label: 'Rol tabanlı erişim kontrolü' },
];

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => { setEmail(''); setPassword(''); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş sırasında hata oluştu');
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>

      {/* ── Left panel — brand anchor, always dark navy ─────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between overflow-hidden p-12"
        style={{ background: '#0b1c35' }}
      >
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Right edge separator */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-px"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.07) 75%, transparent 100%)',
          }}
        />
        {/* Faint bottom-left accent */}
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col gap-12">
          {/* Org identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="h-6 w-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.38)' }}
            >
              Tuzla Belediyesi
            </span>
          </div>

          {/* Main heading */}
          <div>
            <h1 className="text-3xl font-bold leading-snug text-white">
              Afet İşleri ve<br />Risk Yönetimi
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Kurumsal yönetim bilgi sistemi — etkinlik koordinasyonu, personel takibi ve acil durum yönetimi için merkezi platform.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3.5">
            {FEATURES.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.48)' }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.22)' }} />
          <span
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            Yetkili personele özel sistem
          </span>
        </div>
      </div>

      {/* ── Right panel — theme-aware login form ─────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-12"
        style={{ background: 'var(--app-bg)' }}
      >
        {/* Mobile-only org header */}
        <div className="mb-10 text-center lg:hidden">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)' }}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-7 w-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <p className="text-sm font-semibold text-app-text">Tuzla Belediyesi</p>
          <p className="text-xs text-app-muted mt-0.5">Afet İşleri ve Risk Yönetimi</p>
        </div>

        <div className="w-full max-w-[340px]">
          {/* Form heading */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-app-text">Sisteme Giriş</h2>
            <p className="mt-1 text-sm text-app-muted">Kurumsal kimlik bilgilerinizle devam edin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--app-text-muted)' }}
              >
                E-posta
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--app-text-muted)' }}
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tuzla.gov.tr"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--app-text)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-strong)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--app-text-muted)' }}
              >
                Şifre
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: 'var(--app-text-muted)' }}
                />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="block w-full rounded-lg py-2.5 pl-9 pr-10 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--app-text)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-strong)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.2)',
                  color: '#fda4af',
                }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: '#1d4ed8', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Kimlik Doğrulanıyor…
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            className="mt-8 flex items-center justify-between border-t pt-5 text-[11px]"
            style={{ borderColor: 'var(--card-border)', color: 'var(--app-text-muted)' }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              SSL Güvenli Bağlantı
            </span>
            <span>© 2026 Tuzla Belediyesi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
