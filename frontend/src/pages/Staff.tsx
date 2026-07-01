import { FormEvent, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getDepartments, createDepartment, deleteDepartment, type DepartmentDto } from '../api/departments';
import { getStaffList, createStaff, updateStaff, deleteStaff, type StaffDto, type StaffInput } from '../api/staff';

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as any).response?.data?.error;
    if (resp) return resp;
  }
  return err instanceof Error ? err.message : 'Bir hata oluştu';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

type SelectValue = '' | 'volunteer' | string;

export default function Staff() {
  const { token, admin } = useAuth();
  const isSuperAdmin = !!admin?.is_super_admin;

  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Staff form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deptSelectValue, setDeptSelectValue] = useState<SelectValue>('');
  const [staffStatus, setStaffStatus] = useState<'active' | 'inactive'>('active');

  // Department modal state
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);

  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sl, dl] = await Promise.all([getStaffList(), getDepartments()]);
      setStaffList(sl || []);
      setDepartments(dl || []);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openAdd = () => {
    setEditTarget(null);
    setFirstName('');
    setLastName('');
    setTcNo('');
    setBirthDate('');
    setEmail('');
    setPhone('');
    setDeptSelectValue('');
    setStaffStatus('active');
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (s: StaffDto) => {
    setEditTarget(s);
    setFirstName(s.first_name);
    setLastName(s.last_name);
    setTcNo('');
    setBirthDate(s.birth_date ? s.birth_date.slice(0, 10) : '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setDeptSelectValue(s.is_volunteer ? 'volunteer' : (s.department_id ? String(s.department_id) : ''));
    setStaffStatus(s.status);
    setFormError(null);
    setFormOpen(true);
  };

  const buildStaffInput = (): StaffInput => {
    const isVol = deptSelectValue === 'volunteer';
    const deptId = !isVol && deptSelectValue ? Number(deptSelectValue) : null;
    return {
      first_name: firstName,
      last_name: lastName,
      tc_no: tcNo || undefined,
      birth_date: birthDate || undefined,
      email: email || undefined,
      phone: phone || undefined,
      department_id: deptId,
      is_volunteer: isVol,
      status: staffStatus,
    };
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptSelectValue) {
      setFormError('Birim veya Gönüllü seçimi zorunludur');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await updateStaff(editTarget.id, buildStaffInput());
        setSuccess('Personel güncellendi');
      } else {
        await createStaff(buildStaffInput());
        setSuccess('Personel eklendi');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: StaffDto) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`"${s.first_name} ${s.last_name}" adlı personeli silmek istediğinize emin misiniz?`)) return;
    setDeletingStaffId(s.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteStaff(s.id);
      setSuccess('Personel silindi');
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setDeletingStaffId(null);
    }
  };

  const handleAddDept = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setDeptSaving(true);
    setDeptError(null);
    try {
      await createDepartment(deptName.trim());
      setDeptName('');
      const dl = await getDepartments();
      setDepartments(dl || []);
    } catch (err) {
      setDeptError(extractError(err));
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (id: number) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu birimi silmek istediğinize emin misiniz?')) return;
    setDeletingDeptId(id);
    setDeptError(null);
    try {
      await deleteDepartment(id);
      const dl = await getDepartments();
      setDepartments(dl || []);
    } catch (err) {
      setDeptError(extractError(err));
    } finally {
      setDeletingDeptId(null);
    }
  };

  const colSpan = isSuperAdmin ? 8 : 7;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent-soft text-app-text shadow-sm ring-1 ring-app-border">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-text">Ekip / Personel</h2>
            <p className="text-xs text-app-muted">TC kimlik numaraları listede maskelidir</p>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setDeptModalOpen(true); setDeptError(null); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-xs font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Birimleri Yönet</span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Personel Ekle</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{success}</div>
      )}

      {/* Staff table */}
      <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm backdrop-blur-[10px] transition">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-app-border bg-app-base text-[11px] font-semibold text-app-muted">
                <th className="px-4 py-3 text-left">Ad Soyad</th>
                <th className="px-4 py-3 text-left">TC Kimlik</th>
                <th className="px-4 py-3 text-left">Doğum Tarihi</th>
                <th className="px-4 py-3 text-left">E-posta</th>
                <th className="px-4 py-3 text-left">Telefon</th>
                <th className="px-4 py-3 text-left">Birim</th>
                <th className="px-4 py-3 text-left">Durum</th>
                {isSuperAdmin && <th className="px-4 py-3 text-right">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-app-muted">Yükleniyor…</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center italic text-app-muted">
                    Kayıtlı personel bulunamadı.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-medium text-app-text">{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-2.5 font-mono text-app-muted">{s.tc_no ?? '—'}</td>
                    <td className="px-4 py-2.5 text-app-muted">{formatDate(s.birth_date)}</td>
                    <td className="px-4 py-2.5 text-app-muted">{s.email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-app-muted">{s.phone ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {s.is_volunteer ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Gönüllü
                        </span>
                      ) : (
                        <span className="text-app-text">{s.department_name ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {s.status === 'active' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          Pasif
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                          >
                            <Pencil className="h-3 w-3" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            disabled={deletingStaffId === s.id}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" />
                            Sil
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl animate-slide-up"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <h3 className="text-sm font-semibold text-app-text">
                {editTarget ? 'Personel Düzenle' : 'Yeni Personel'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-app-muted transition hover:text-app-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">Ad *</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">Soyad *</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">
                    TC Kimlik No
                    {editTarget && <span className="ml-1 text-app-muted">(boş = değişmez)</span>}
                  </label>
                  <input
                    value={tcNo}
                    onChange={(e) => setTcNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    maxLength={11}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 font-mono text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="11 haneli"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">E-posta</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-app-text">Telefon</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-app-text">Birim / Kategori *</label>
                <select
                  value={deptSelectValue}
                  onChange={(e) => setDeptSelectValue(e.target.value as SelectValue)}
                  className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">-- Seçin --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                  <option value="volunteer">Gönüllü</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-app-text">Durum</label>
                <select
                  value={staffStatus}
                  onChange={(e) => setStaffStatus(e.target.value as 'active' | 'inactive')}
                  className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

              {formError && (
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-app-border bg-app-base px-4 py-2 text-xs font-semibold text-app-text transition hover:bg-app-accent-soft"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor…' : (editTarget ? 'Güncelle' : 'Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department management modal */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl animate-slide-up"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <h3 className="text-sm font-semibold text-app-text">Birimleri Yönet</h3>
              <button
                type="button"
                onClick={() => setDeptModalOpen(false)}
                className="text-app-muted transition hover:text-app-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <form onSubmit={handleAddDept} className="flex gap-2">
                <input
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Yeni birim adı"
                  className="flex-1 rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  disabled={deptSaving || !deptName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ekle
                </button>
              </form>

              {deptError && (
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {deptError}
                </div>
              )}

              <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                {departments.length === 0 ? (
                  <li className="py-4 text-center text-xs italic text-app-muted">Birim bulunamadı.</li>
                ) : (
                  departments.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-app-text">{d.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDept(d.id)}
                        disabled={deletingDeptId === d.id}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        <Trash2 className="h-3 w-3" />
                        Sil
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
