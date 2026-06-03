import { FormEvent, useEffect, useState } from 'react';
import { Filter, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createAdmin, deleteAdmin, getAdmins } from '../api/admins';

type Admin = {
  id: number;
  email: string;
  is_super_admin: number | boolean;
  created_at: string;
};

export default function AdminManagement() {
  const { token, admin: currentAdmin } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAdmins = async () => {
    const data = await getAdmins();
    setAdmins(data || []);
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(
      'Bu admini silmek istediğinize emin misiniz?',
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);
    setDeletingId(id);

    try {
      await deleteAdmin(id);

      setSuccess('Admin başarıyla silindi');
      await loadAdmins();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Admin delete request failed:', err);
      setError(
        err instanceof Error ? err.message : 'Admin silinirken hata oluştu',
      );
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (token) {
      loadAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createAdmin({ email, password });
      setEmail('');
      setPassword('');
      setSuccess('Yeni admin başarıyla eklendi');
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Admin eklenirken hata oluştu',
      );
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
      <section className="rounded-xl border border-app-border bg-app-card p-4 shadow-sm backdrop-blur-[10px] transition">
        <h2 className="mb-3 text-sm font-semibold text-app-text">
          Admin Listesi
        </h2>
        <p className="mb-4 text-xs text-app-muted">
          Yalnızca giriş yapmış adminler bu ekranı görebilir; yeni admin ekleme
          yetkisi ise sadece süper adminlerdedir.
        </p>

        <ul className="space-y-2 text-xs">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex items-center justify-between rounded-md border border-app-border bg-app-base px-3 py-2"
            >
              <div>
                <p className="font-medium text-app-text">{admin.email}</p>
                <p className="text-[11px] text-app-muted">
                  Oluşturulma:{' '}
                  {new Date(admin.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {admin.is_super_admin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    Süper Admin
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-100">
                    Admin
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/calendar?adminId=${admin.id.toString()}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-200 transition hover:bg-indigo-500/20"
                >
                  <Filter className="h-3 w-3" />
                  <span>Takvimde Filtrele</span>
                </button>

                {currentAdmin && currentAdmin.id !== admin.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(admin.id)}
                    disabled={deletingId === admin.id}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Sil</span>
                  </button>
                )}
              </div>
            </li>
          ))}
          {admins.length === 0 && (
            <li className="text-xs text-app-muted italic text-center py-4">
              Kayıtlı admin bulunamadı.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-app-border bg-app-card p-4 shadow-sm backdrop-blur-[10px] transition">
        <h2 className="mb-3 text-sm font-semibold text-app-text">
          Yeni Admin Ekle
        </h2>
        <p className="mb-4 text-xs text-app-muted">
          Buradan yalnızca e-posta ve şifre ile yeni admin hesabı
          oluşturabilirsiniz. Kayıt (sign-up) ekranı yoktur.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1 block font-medium text-app-text"
            >
              E-posta
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="yeni.admin@ornek.com"
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1 block font-medium text-app-text"
            >
              Şifre
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="En az 8 karakter"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-sm shadow-indigo-500/40 transition hover:bg-indigo-400"
          >
            Admin Oluştur
          </button>
        </form>
      </section>
    </div>
  );
}

