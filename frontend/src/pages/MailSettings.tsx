import { FormEvent, useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Mail, Save } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import {
  getMailSettings,
  updateMailSettings,
  type MailSettingsDto,
} from '../api/settings';
import { sendTestMail } from '../api/mail';

type FormState = {
  apiKey: string;
};

export default function MailSettings() {
  const { token, admin } = useAuth();

  const isAllowed = !!admin?.is_super_admin;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState<MailSettingsDto['mode']>('smtp');
  const [senderEmail, setSenderEmail] = useState('xenooo98@gmail.com');

  const [form, setForm] = useState<FormState>({
    apiKey: '',
  });

  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const isApiConfigured = useMemo(() => mode === 'api', [mode]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      if (!isAllowed) return;
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await getMailSettings();
        setMode(data.mode);
        setSenderEmail(data.senderEmail || 'xenooo98@gmail.com');
        setForm({
          apiKey: '',
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'SMTP ayarları alınamadı',
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAllowed, token]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!isAllowed) return;

    window.alert(
      'Brevo ayarları ENV üzerinden yönetilir (BREVO_API_KEY / BREVO_SENDER_EMAIL / BREVO_SENDER_NAME). Panelden kaydetme kapalıdır.'
    );
  };

  const handleTest = async () => {
    if (!token) return;
    if (!isAllowed) return;

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const to = testTo.trim();
      await sendTestMail({ to: to || undefined });
      setTestResult('Test maili başarıyla gönderildi.');
    } catch (err) {
      setTestResult(null);
      if (axios.isAxiosError(err)) {
        const apiErr = (err.response?.data as any)?.error;
        const apiDetail = (err.response?.data as any)?.detail;
        const apiCode = (err.response?.data as any)?.code;
        const msg = `Test maili gönderilemedi${apiErr ? ` | ${apiErr}` : ''}${apiDetail ? ` | ${apiDetail}` : ''}${apiCode ? ` | ${String(apiCode)}` : ''}`;
        // eslint-disable-next-line no-alert
        window.alert(msg);
        setError(msg);
      } else {
        const msg = err instanceof Error ? err.message : 'Test maili gönderilemedi';
        // eslint-disable-next-line no-alert
        window.alert(msg);
        setError(msg);
      }
    } finally {
      setTesting(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        Yetkisiz Erişim
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border bg-app-card p-4 shadow-sm backdrop-blur-[10px] transition">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-app-text">Mail Ayarları</h2>
            <p className="mt-1 text-xs text-app-muted">
              Brevo REST API ile mail gönderimi. Ayarlar sunucu ortam değişkenleri (ENV) ile yönetilir.
            </p>
          </div>
          <div className="rounded-full border border-app-border bg-app-base px-3 py-1 text-[11px] text-app-text">
            Mod: <span className="font-semibold">{mode === 'api' ? 'API Modu Aktif' : 'SMTP (fallback)'}</span>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-app-muted">Yükleniyor…</div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSave} className="mt-4 grid gap-3 text-xs md:grid-cols-2">
          <div className="md:col-span-2 rounded-xl border border-app-border bg-app-base p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold text-app-text">
                  API Modu
                </div>
                <div className="mt-0.5 text-[11px] text-app-muted">
                  Gönderici zorunlu: <span className="font-semibold">{senderEmail}</span>
                </div>
              </div>
              <div className="rounded-full border border-app-border bg-app-card px-2 py-0.5 text-[10px] font-semibold text-app-text">
                {isApiConfigured ? 'Aktif' : 'Kapalı'}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-app-text" htmlFor="brevo-api-key">
              Brevo API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-app-base text-app-text">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="brevo-api-key"
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ apiKey: e.target.value })}
                disabled
                className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                placeholder="ENV üzerinden yönetilir (BREVO_API_KEY)"
              />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Not: API Key/Gönderici bilgilerini panelden kaydetmiyoruz. Render/Server ENV üzerinden tanımlayın.
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>

            <div className="ml-auto flex min-w-[260px] items-center gap-2">
              <input
                id="mail-test-recipient"
                name="mail-test-recipient"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Test maili alıcısı (boş = default)"
                className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/15 disabled:opacity-70"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Test
              </button>
            </div>
          </div>

          {testResult ? (
            <div className="md:col-span-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {testResult}
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
