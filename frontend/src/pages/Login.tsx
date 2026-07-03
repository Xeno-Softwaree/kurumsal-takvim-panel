import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

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
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--app-bg)' }}
    >
      {/* Subtle diagonal stripe texture — light/dark aware via CSS var */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent, transparent 48px, var(--card-border) 48px, var(--card-border) 49px)',
        }}
      />

      <div className="relative z-10 w-full max-w-[360px]">

        {/* ── Emblem + identity ─────────────────────────────────────────── */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          {/* Double-ring badge with blue glow halo */}
          <div className="relative">
            {/* Blue light behind logo — uses existing --accent-glow token, works in both themes */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 160,
                height: 160,
                background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 68%)',
              }}
            />
          <div
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full"
            style={{ border: '1.5px solid var(--border-strong)' }}
          >
            <div
              className="flex h-[54px] w-[54px] items-center justify-center rounded-full"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement!;
                  parent.innerHTML = '<span style="font-size:18px;font-weight:700;color:var(--app-text)">T</span>';
                }}
              />
            </div>
          </div>
          </div>

          {/* Org text */}
          <div>
            <p
              className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--app-text-muted)' }}
            >
              T.C. Tuzla Belediyesi
            </p>
            <h1
              className="text-[22px] font-bold leading-tight"
              style={{ color: 'var(--app-text)' }}
            >
              Afet İşleri ve<br />Risk Yönetimi
            </h1>
            <p
              className="mt-1.5 text-[11px] uppercase tracking-[0.15em]"
              style={{ color: 'var(--app-text-subtle)' }}
            >
              Yönetim Bilgi Sistemi
            </p>
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--app-text-muted)' }}
          >
            Yönetici Girişi
          </span>
          <div className="h-px flex-1" style={{ background: 'var(--card-border)' }} />
        </div>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wider"
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
                placeholder="ad@tuzla.gov.tr"
                autoComplete="email"
                required
                className="block w-full rounded-md py-2.5 pl-9 pr-3 text-sm outline-none transition-all"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--app-text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.55)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.09)';
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
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wider"
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
                className="block w-full rounded-md py-2.5 pl-9 pr-10 text-sm outline-none transition-all"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--app-text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.55)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.09)';
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
              className="flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm"
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
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: '#1a3a6b' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#1e4080'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1a3a6b'; }}
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

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div
          className="mt-10 flex items-center justify-between border-t pt-5 text-[11px]"
          style={{ borderColor: 'var(--card-border)', color: 'var(--app-text-subtle)' }}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            SSL Güvenli Bağlantı
          </span>
          <span>© 2026 Tuzla Belediyesi</span>
        </div>
      </div>
    </div>
  );
}
