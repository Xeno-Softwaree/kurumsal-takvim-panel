import { FormEvent, useEffect, useState } from 'react';
import { Building2, Landmark, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { getDepartments, createDepartment, deleteDepartment, type DepartmentDto } from '../api/departments';
import { getDirectorates, createDirectorate, deleteDirectorate, type DirectorateDto } from '../api/directorates';
import { getStaffList, getStaffMember, createStaff, updateStaff, deleteStaff, type StaffDto, type StaffDetailDto, type StaffInput } from '../api/staff';
import { returnAssignment } from '../api/inventory';

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
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();

  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [directorates, setDirectorates] = useState<DirectorateDto[]>([]);
  const [loading, setLoading] = useState(false);

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
  const [directorateId, setDirectorateId] = useState<string>('');
  const [staffStatus, setStaffStatus] = useState<'active' | 'inactive'>('active');

  // Department modal state
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);

  // Directorate modal state
  const [dirModalOpen, setDirModalOpen] = useState(false);
  const [dirName, setDirName] = useState('');
  const [dirSaving, setDirSaving] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [deletingDirId, setDeletingDirId] = useState<number | null>(null);

  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);

  // Zimmetler modal
  const [zimmetTarget, setZimmetTarget] = useState<StaffDetailDto | null>(null);
  const [zimmetLoading, setZimmetLoading] = useState(false);
  const [zimmetError, setZimmetError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);

  // Search + filter
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [sl, dl, dirl] = await Promise.all([getStaffList(), getDepartments(), getDirectorates()]);
      setStaffList(sl || []);
      setDepartments(dl || []);
      setDirectorates(dirl || []);
    } catch (err) {
      showError(extractError(err));
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
    setDirectorateId('');
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
    setDirectorateId(s.directorate_id ? String(s.directorate_id) : '');
    setStaffStatus(s.status);
    setFormError(null);
    setFormOpen(true);
  };

  const buildStaffInput = (): StaffInput => {
    const isVol = deptSelectValue === 'volunteer';
    const deptId = !isVol && deptSelectValue ? Number(deptSelectValue) : null;
    const dirId = directorateId ? Number(directorateId) : null;
    return {
      first_name: firstName,
      last_name: lastName,
      tc_no: tcNo || undefined,
      birth_date: birthDate || undefined,
      email: email || undefined,
      phone: phone || undefined,
      department_id: deptId,
      directorate_id: dirId,
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
        showSuccess('Personel güncellendi');
      } else {
        await createStaff(buildStaffInput());
        showSuccess('Personel eklendi');
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
    if (!await confirm(`"${s.first_name} ${s.last_name}" adlı personeli silmek istediğinize emin misiniz?`, { variant: 'danger' })) return;
    setDeletingStaffId(s.id);
    try {
      await deleteStaff(s.id);
      showSuccess('Personel silindi');
      await load();
    } catch (err) {
      showError(extractError(err));
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
    if (!await confirm('Bu birimi silmek istediğinize emin misiniz?', { variant: 'danger' })) return;
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

  const handleAddDir = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirName.trim()) return;
    setDirSaving(true);
    setDirError(null);
    try {
      await createDirectorate(dirName.trim());
      setDirName('');
      const dirl = await getDirectorates();
      setDirectorates(dirl || []);
    } catch (err) {
      setDirError(extractError(err));
    } finally {
      setDirSaving(false);
    }
  };

  const handleDeleteDir = async (id: number) => {
    if (!await confirm('Bu müdürlüğü silmek istediğinize emin misiniz?', { variant: 'danger' })) return;
    setDeletingDirId(id);
    setDirError(null);
    try {
      await deleteDirectorate(id);
      const dirl = await getDirectorates();
      setDirectorates(dirl || []);
    } catch (err) {
      setDirError(extractError(err));
    } finally {
      setDeletingDirId(null);
    }
  };

  const openZimmet = async (s: StaffDto) => {
    setZimmetLoading(true);
    setZimmetError(null);
    setZimmetTarget(null);
    try {
      const detail = await getStaffMember(s.id);
      setZimmetTarget(detail);
    } catch (err) {
      showError(extractError(err));
    } finally {
      setZimmetLoading(false);
    }
  };

  const handleReturn = async (assignmentId: number) => {
    if (!zimmetTarget) return;
    if (!await confirm('Bu zimmeti iade almak istiyor musunuz?', { confirmLabel: 'İade Al' })) return;
    setReturningId(assignmentId);
    setZimmetError(null);
    try {
      await returnAssignment(assignmentId);
      const detail = await getStaffMember(zimmetTarget.id);
      setZimmetTarget(detail);
    } catch (err) {
      setZimmetError(extractError(err));
    } finally {
      setReturningId(null);
    }
  };

  // Computed stats
  const statAktif      = staffList.filter(s => s.status === 'active' && !s.is_volunteer).length;
  const statGonullu    = staffList.filter(s => s.is_volunteer).length;
  const statMudurluklu = staffList.filter(s => s.directorate_id !== null).length;
  const statPasif      = staffList.filter(s => s.status === 'inactive').length;

  // Filter options (dynamic from departments + directorates)
  const filterOptions = [
    { key: 'all', label: 'Tümü' },
    ...departments.map(d => ({ key: `dept-${d.id}`, label: d.name })),
    ...directorates.map(d => ({ key: `dir-${d.id}`, label: d.name })),
  ];

  const filteredList = staffList.filter(s => {
    const q = search.trim().toLowerCase();
    if (q && !`${s.first_name} ${s.last_name}`.toLowerCase().includes(q)) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter.startsWith('dept-')) return s.department_id === parseInt(activeFilter.slice(5), 10);
    if (activeFilter.startsWith('dir-')) return s.directorate_id === parseInt(activeFilter.slice(4), 10);
    return true;
  });

  const AVATAR_COLORS = [
    'bg-indigo-500/20 text-indigo-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-amber-500/20 text-amber-400',
    'bg-rose-500/20 text-rose-400',
    'bg-sky-500/20 text-sky-400',
    'bg-violet-500/20 text-violet-400',
  ];

  // 8 base cols + 1 if super admin (e-posta & telefon merged into İletişim)
  const colSpan = isSuperAdmin ? 9 : 8;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft ring-1 ring-app-border">
            <Users className="h-5 w-5 text-app-text" />
          </div>
          <div>
            <h2 className="text-base font-bold text-app-text">Ekip / Personel</h2>
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
              onClick={() => { setDirModalOpen(true); setDirError(null); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-base px-3 py-1.5 text-xs font-semibold text-app-text shadow-sm transition hover:bg-app-accent-soft"
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>Müdürlükleri Yönet</span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Personel Ekle</span>
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'AKTİF',     value: statAktif,      unit: 'personel', dot: 'bg-emerald-400' },
          { label: 'GÖNÜLLÜ',   value: statGonullu,    unit: 'kişi',     dot: 'bg-amber-400'   },
          { label: 'MÜDÜRLÜK',  value: statMudurluklu, unit: 'personel', dot: 'bg-blue-400'    },
          { label: 'PASİF',     value: statPasif,      unit: 'personel', dot: 'bg-slate-400'   },
        ].map(({ label, value, unit, dot }) => (
          <div key={label} className="rounded-xl border border-app-border bg-app-card px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-app-muted">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="stat-number text-2xl font-bold text-app-text">{value}</span>
              <span className="text-xs text-app-muted">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya soyad ara…"
            className="w-full rounded-lg border border-app-border bg-app-base py-2 pl-8 pr-3 text-xs text-app-text outline-none transition placeholder:text-app-muted focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveFilter(opt.key)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                activeFilter === opt.key
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-app-border bg-app-base text-app-muted hover:bg-app-accent-soft'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff table */}
      <div className="overflow-hidden rounded-2xl border border-app-border bg-app-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-app-border bg-app-base">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Personel</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">TC Kimlik</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Doğum</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">İletişim</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Birim</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Müdürlük</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Durum</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-app-muted">Zimmetler</th>
                {isSuperAdmin && <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-app-muted">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-app-muted">Yükleniyor…</td></tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center italic text-app-muted">
                    {search || activeFilter !== 'all' ? 'Arama kriterine uyan personel bulunamadı.' : 'Kayıtlı personel bulunamadı.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((s) => {
                  const avatarCls = AVATAR_COLORS[s.id % AVATAR_COLORS.length];
                  const initials = `${s.first_name[0] ?? ''}${s.last_name[0] ?? ''}`.toUpperCase();
                  return (
                    <tr key={s.id} className="table-row-hover">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarCls}`}>
                            {initials}
                          </div>
                          <span className="font-medium text-app-text">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-app-muted">{s.tc_no ?? '—'}</td>
                      <td className="px-4 py-2.5 text-app-muted">{formatDate(s.birth_date)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {s.email ? <span className="text-app-muted">{s.email}</span> : null}
                          {s.phone ? <span className="text-app-muted">{s.phone}</span> : null}
                          {!s.email && !s.phone ? <span className="text-app-muted">—</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {s.is_volunteer ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            Gönüllü
                          </span>
                        ) : (
                          <span className="text-app-text">{s.department_name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-app-muted">{s.directorate_name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                          {s.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => openZimmet(s)}
                          className="inline-flex items-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-400 transition hover:bg-cyan-500/20"
                        >
                          Zimmetler
                        </button>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(s)}
                              className="inline-flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-400 transition hover:bg-violet-500/20"
                            >
                              <Pencil className="h-3 w-3" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s)}
                              disabled={deletingStaffId === s.id}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-60"
                            >
                              <Trash2 className="h-3 w-3" />
                              Sil
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="mb-1 block text-xs font-medium text-app-text">Müdürlük</label>
                  <select
                    value={directorateId}
                    onChange={(e) => setDirectorateId(e.target.value)}
                    className="block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="">-- Opsiyonel --</option>
                    {directorates.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                </div>
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

      {/* Zimmetler modal — visible to all admins; return button only for super admins */}
      {(zimmetTarget || zimmetLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl animate-slide-up"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <h3 className="text-sm font-semibold text-app-text">
                {zimmetTarget ? `${zimmetTarget.first_name} ${zimmetTarget.last_name} — Zimmetler` : 'Yükleniyor…'}
              </h3>
              <button type="button" onClick={() => setZimmetTarget(null)} className="text-app-muted transition hover:text-app-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {zimmetLoading ? (
                <p className="text-xs text-app-muted text-center py-4">Yükleniyor…</p>
              ) : zimmetTarget?.active_assignments.length === 0 ? (
                <p className="text-xs text-app-muted text-center py-4">Aktif zimmet kaydı yok.</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {zimmetTarget?.active_assignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-app-text">{a.item_name}{a.variant_label ? ` / ${a.variant_label}` : ''}</p>
                        <p className="text-app-muted">{a.quantity} adet · {formatDate(a.assigned_at)}</p>
                        {a.notes && <p className="text-app-muted mt-0.5">{a.notes}</p>}
                      </div>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleReturn(a.id)}
                          disabled={returningId === a.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                          İade Al
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {zimmetError && (
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{zimmetError}</div>
              )}
              <button
                type="button"
                onClick={() => setZimmetTarget(null)}
                className="w-full rounded-lg border border-app-border bg-app-base px-4 py-2 text-xs font-semibold text-app-text transition hover:bg-app-accent-soft"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directorate management modal */}
      {dirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl animate-slide-up"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
              <h3 className="text-sm font-semibold text-app-text">Müdürlükleri Yönet</h3>
              <button
                type="button"
                onClick={() => setDirModalOpen(false)}
                className="text-app-muted transition hover:text-app-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <form onSubmit={handleAddDir} className="flex gap-2">
                <input
                  value={dirName}
                  onChange={(e) => setDirName(e.target.value)}
                  placeholder="Yeni müdürlük adı"
                  className="flex-1 rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-text outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  disabled={dirSaving || !dirName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-indigo-400 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ekle
                </button>
              </form>

              {dirError && (
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {dirError}
                </div>
              )}

              <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                {directorates.length === 0 ? (
                  <li className="py-4 text-center text-xs italic text-app-muted">Müdürlük bulunamadı.</li>
                ) : (
                  directorates.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-app-text">{d.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDir(d.id)}
                        disabled={deletingDirId === d.id}
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
