import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import LogoIntro from '../components/LogoIntro';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: { pathname: string; search: string; hash: string } })?.from;
      if (from?.pathname) {
        navigate(`${from.pathname}${from.search}${from.hash}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş sırasında hata oluştu');
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: 'var(--app-bg)' }}
    >
      {/* Subtle ambient blobs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(80px)' }}
      />

      {/* Fine dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] animate-fade-in">

        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoIntro />
          <div>
            <h1 className="text-[22px] font-800 leading-tight" style={{ color: 'var(--app-text)' }}>
              Tuzla Belediyesi
            </h1>
            <p className="text-[13px] font-500 mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
              Afet İşleri ve Risk Yönetimi
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Card header */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-700 leading-tight" style={{ color: 'var(--app-text)' }}>
                Yönetici Girişi
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                Güvenli admin portalı
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                Kurumsal E-posta
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: 'var(--app-text-muted)' }}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tuzla.gov.tr"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg py-2.5 pl-9 pr-3 text-[13px] outline-none transition-all duration-200"
                  style={{
                    background: 'var(--app-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--app-text)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--card-border)';    e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                Güvenlik Şifresi
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: 'var(--app-text-muted)' }}
                />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 karakter"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="block w-full rounded-lg py-2.5 pl-9 pr-10 text-[13px] outline-none transition-all duration-200"
                  style={{
                    background: 'var(--app-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--app-text)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'var(--card-border)';    e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--app-text-muted)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-[12px] font-500 animate-slide-up"
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  color: '#fda4af',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-700 text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(59,130,246,0.45)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(59,130,246,0.3)'; }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Kimlik Doğrulanıyor…</span>
                </>
              ) : (
                <span>Giriş Yap</span>
              )}
            </button>
          </form>

          {/* Footer meta */}
          <div
            className="mt-6 flex items-center justify-between pt-5 text-[10px] font-600 uppercase tracking-wider"
            style={{ borderTop: '1px solid var(--card-border)', color: 'var(--app-text-muted)' }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              SSL Güvenli Bağlantı
            </span>
            <span>Sistem v2.0</span>
          </div>
        </div>

        {/* Copyright */}
        <p className="mt-6 text-center text-[11px]" style={{ color: 'var(--app-text-subtle)' }}>
          © 2026 Tuzla Belediyesi — Afet Yönetim Bilgi Sistemi
        </p>
      </div>
    </div>
  );
}
