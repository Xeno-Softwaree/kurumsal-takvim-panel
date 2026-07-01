import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addVariant,
  adjustVariant,
  getVariantAssignments,
  createAssignment,
  returnAssignment,
  type InventoryItemDto,
  type InventoryVariantDto,
  type AssignmentDto,
} from '../api/inventory';
import { getStaffList, type StaffDto } from '../api/staff';
import {
  Package,
  PackagePlus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

function extractError(err: unknown): string {
  return (err as any)?.response?.data?.error ?? 'Beklenmeyen bir hata oluştu';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

function stockBadge(qty: number) {
  if (qty === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-semibold">Stok Yok</span>;
  if (qty <= 5)  return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-semibold">{qty} adet</span>;
  return              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 font-semibold">{qty} adet</span>;
}

// ── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <h3 className="font-semibold text-sm text-app-text">{title}</h3>
          <button onClick={onClose}
            className="p-1 rounded hover:bg-app-accent-soft transition-colors text-app-muted hover:text-app-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-app-muted font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full rounded-lg px-3 py-2 text-sm',
  'bg-app-base border border-app-border text-app-text',
  'focus:outline-none focus:border-blue-500 transition-colors',
].join(' ');

export default function Inventory() {
  const { admin } = useAuth();
  const isSuperAdmin = !!admin?.is_super_admin;
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Add item modal
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addHasVariant, setAddHasVariant] = useState(false);
  const [addVariants, setAddVariants] = useState<{ label: string; quantity: string }[]>([{ label: '', quantity: '0' }]);
  const [addLoading, setAddLoading] = useState(false);

  // Edit item modal
  const [editItem, setEditItem] = useState<InventoryItemDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Add variant modal
  const [variantItem, setVariantItem] = useState<InventoryItemDto | null>(null);
  const [variantLabel, setVariantLabel] = useState('');
  const [variantQty, setVariantQty] = useState('0');
  const [variantLoading, setVariantLoading] = useState(false);

  // Adjust stock modal
  const [adjustVariantRow, setAdjustVariantRow] = useState<{ variant: InventoryVariantDto; item: InventoryItemDto } | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Detail / assignments modal
  const [detailVariant, setDetailVariant] = useState<{ variant: InventoryVariantDto; item: InventoryItemDto } | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Assign modal
  const [assignVariantRow, setAssignVariantRow] = useState<{ variant: InventoryVariantDto; item: InventoryItemDto } | null>(null);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignQty, setAssignQty] = useState('1');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, staff] = await Promise.all([getInventoryItems(), getStaffList()]);
      setItems(data);
      setStaffList(staff.filter(s => s.status === 'active'));
    } catch (err) {
      showError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  function toggleCollapse(id: number) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Add item ─────────────────────────────────────────────────────────────
  function openAdd() {
    setAddName(''); setAddCategory(''); setAddHasVariant(false);
    setAddVariants([{ label: '', quantity: '0' }]);
    setShowAdd(true);
  }

  async function handleAdd() {
    if (!addName.trim()) { showError('Ürün adı zorunludur'); return; }
    setAddLoading(true);
    try {
      const variantPayload = addHasVariant
        ? addVariants.filter(v => v.label.trim()).map(v => ({ label: v.label.trim(), quantity: parseInt(v.quantity, 10) || 0 }))
        : [{ label: null, quantity: parseInt(addVariants[0]?.quantity || '0', 10) || 0 }];
      await createInventoryItem({ name: addName.trim(), category: addCategory.trim() || undefined, has_variant: addHasVariant, variants: variantPayload });
      setShowAdd(false);
      showSuccess('Ürün eklendi');
      await load();
    } catch (err) { showError(extractError(err)); }
    finally { setAddLoading(false); }
  }

  // ── Edit item ─────────────────────────────────────────────────────────────
  function openEdit(item: InventoryItemDto) {
    setEditItem(item); setEditName(item.name); setEditCategory(item.category ?? '');
  }

  async function handleEdit() {
    if (!editItem || !editName.trim()) { showError('Ürün adı zorunludur'); return; }
    setEditLoading(true);
    try {
      await updateInventoryItem(editItem.id, { name: editName.trim(), category: editCategory.trim() || undefined });
      setEditItem(null);
      showSuccess('Ürün güncellendi');
      await load();
    } catch (err) { showError(extractError(err)); }
    finally { setEditLoading(false); }
  }

  // ── Delete item ───────────────────────────────────────────────────────────
  async function handleDelete(item: InventoryItemDto) {
    if (!confirm(`"${item.name}" silinsin mi?`)) return;
    try {
      await deleteInventoryItem(item.id);
      showSuccess('Ürün silindi');
      await load();
    } catch (err) { showError(extractError(err)); }
  }

  // ── Add variant ───────────────────────────────────────────────────────────
  function openAddVariant(item: InventoryItemDto) {
    setVariantItem(item); setVariantLabel(''); setVariantQty('0');
  }

  async function handleAddVariant() {
    if (!variantItem) return;
    setVariantLoading(true);
    try {
      await addVariant(variantItem.id, { label: variantLabel.trim() || null, quantity: parseInt(variantQty, 10) || 0 });
      setVariantItem(null);
      showSuccess('Varyant eklendi');
      await load();
    } catch (err) { showError(extractError(err)); }
    finally { setVariantLoading(false); }
  }

  // ── Adjust stock ──────────────────────────────────────────────────────────
  function openAdjust(variant: InventoryVariantDto, item: InventoryItemDto) {
    setAdjustVariantRow({ variant, item }); setAdjustDelta(''); setAdjustReason('');
  }

  async function handleAdjust() {
    if (!adjustVariantRow) return;
    const d = parseInt(adjustDelta, 10);
    if (Number.isNaN(d) || d === 0) { showError('Geçerli bir miktar girin'); return; }
    setAdjustLoading(true);
    try {
      await adjustVariant(adjustVariantRow.variant.id, { delta: d, reason: adjustReason.trim() || '' });
      setAdjustVariantRow(null);
      showSuccess('Stok güncellendi');
      await load();
    } catch (err) { showError(extractError(err)); }
    finally { setAdjustLoading(false); }
  }

  // ── Detail / assignments ──────────────────────────────────────────────────
  async function openDetail(variant: InventoryVariantDto, item: InventoryItemDto) {
    setDetailVariant({ variant, item }); setDetailLoading(true); setAssignments([]);
    try {
      const data = await getVariantAssignments(variant.id);
      setAssignments(data);
    } catch (err) { showError(extractError(err)); }
    finally { setDetailLoading(false); }
  }

  async function handleReturn(assignmentId: number) {
    if (!confirm('İade al?')) return;
    try {
      await returnAssignment(assignmentId);
      showSuccess('İade alındı');
      if (detailVariant) {
        const data = await getVariantAssignments(detailVariant.variant.id);
        setAssignments(data);
      }
      await load();
    } catch (err) { showError(extractError(err)); }
  }

  // ── Assign ────────────────────────────────────────────────────────────────
  function openAssign(variant: InventoryVariantDto, item: InventoryItemDto) {
    setAssignVariantRow({ variant, item }); setAssignStaffId(''); setAssignQty('1'); setAssignNotes('');
  }

  async function handleAssign() {
    if (!assignVariantRow) return;
    if (!assignStaffId) { showError('Personel seçin'); return; }
    const qty = parseInt(assignQty, 10);
    if (!qty || qty < 1) { showError('Adet en az 1 olmalıdır'); return; }
    setAssignLoading(true);
    try {
      await createAssignment({ variant_id: assignVariantRow.variant.id, staff_id: parseInt(assignStaffId, 10), quantity: qty, notes: assignNotes.trim() || undefined });
      setAssignVariantRow(null);
      showSuccess('Zimmet verildi');
      await load();
    } catch (err) { showError(extractError(err)); }
    finally { setAssignLoading(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-app-text">
            <Package className="h-5 w-5 text-orange-400" />
            Ekipman / Stok
          </h1>
          <p className="text-xs text-app-muted mt-0.5">{items.length} ürün</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            <PackagePlus className="h-4 w-4" />
            Ürün Ekle
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-app-muted text-sm">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-app-muted text-sm">Henüz ürün eklenmedi.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isOpen = !collapsed.has(item.id);
            const totalQty = item.variants.reduce((s, v) => s + v.quantity, 0);
            return (
              <div key={item.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

                {/* Item header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-app-accent-soft transition-colors"
                  onClick={() => toggleCollapse(item.id)}
                >
                  <span className="text-app-muted">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-app-text">{item.name}</span>
                    {item.category && <span className="ml-2 text-xs text-app-muted">{item.category}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {stockBadge(totalQty)}
                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(item); }}
                          className="p-1 rounded hover:bg-app-accent-soft transition-colors text-app-muted hover:text-blue-400"
                          title="Düzenle"
                        ><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={e => { e.stopPropagation(); openAddVariant(item); }}
                          className="p-1 rounded hover:bg-app-accent-soft transition-colors text-app-muted hover:text-emerald-400"
                          title="Varyant Ekle"
                        ><Plus className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(item); }}
                          className="p-1 rounded hover:bg-app-accent-soft transition-colors text-app-muted hover:text-rose-400"
                          title="Sil"
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Variants table */}
                {isOpen && (
                  <div className="border-t border-app-border">
                    {item.variants.length === 0 ? (
                      <p className="text-xs text-app-muted px-6 py-3">Henüz varyant eklenmedi.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-app-muted border-b border-app-border">
                            <th className="text-left px-6 py-2 font-medium">Varyant</th>
                            <th className="text-left px-4 py-2 font-medium">Stok</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {item.variants.map(v => (
                            <tr key={v.id} className="border-b border-app-border last:border-0 hover:bg-app-accent-soft transition-colors">
                              <td className="px-6 py-2.5 text-sm text-app-text">{v.variant_label ?? '—'}</td>
                              <td className="px-4 py-2.5">{stockBadge(v.quantity)}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 justify-end">
                                  {/* "Zimmetler" button: border+bg so visible on both themes */}
                                  <button
                                    onClick={() => openDetail(v, item)}
                                    className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-base px-2.5 py-1 text-xs font-medium text-app-text hover:bg-app-accent-soft transition-colors"
                                  >Zimmetler</button>
                                  {isSuperAdmin && (
                                    <>
                                      <button
                                        onClick={() => openAssign(v, item)}
                                        className="inline-flex items-center rounded-md border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/20 transition-colors"
                                      >Zimmet Ver</button>
                                      <button
                                        onClick={() => openAdjust(v, item)}
                                        className="inline-flex items-center rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                                      >Stok Ayarla</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Item Modal ─────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Ürün Ekle" onClose={() => setShowAdd(false)}>
          <Field label="Ürün Adı *">
            <input className={inputCls} value={addName} onChange={e => setAddName(e.target.value)} placeholder="Baret, El Telsizi…" />
          </Field>
          <Field label="Kategori">
            <input className={inputCls} value={addCategory} onChange={e => setAddCategory(e.target.value)} placeholder="Koruyucu Ekipman…" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
            <input type="checkbox" checked={addHasVariant} onChange={e => { setAddHasVariant(e.target.checked); setAddVariants([{ label: '', quantity: '0' }]); }} />
            Varyantlı ürün (ör. beden, renk)
          </label>

          {addHasVariant ? (
            <div className="space-y-2">
              <p className="text-xs text-app-muted font-medium">Varyantlar</p>
              {addVariants.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} placeholder="Etiket (ör. M, Kırmızı)" value={v.label}
                    onChange={e => { const n = [...addVariants]; n[i].label = e.target.value; setAddVariants(n); }} />
                  <input className={`${inputCls} w-24`} type="number" min="0" placeholder="Adet" value={v.quantity}
                    onChange={e => { const n = [...addVariants]; n[i].quantity = e.target.value; setAddVariants(n); }} />
                  {addVariants.length > 1 && (
                    <button onClick={() => setAddVariants(addVariants.filter((_, idx) => idx !== i))}
                      className="p-1 rounded hover:bg-app-accent-soft text-rose-400">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setAddVariants([...addVariants, { label: '', quantity: '0' }])}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Varyant Ekle
              </button>
            </div>
          ) : (
            <Field label="Başlangıç Stok Miktarı">
              <input className={inputCls} type="number" min="0" value={addVariants[0]?.quantity ?? '0'}
                onChange={e => setAddVariants([{ label: '', quantity: e.target.value }])} />
            </Field>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
              İptal
            </button>
            <button onClick={handleAdd} disabled={addLoading}
              className="flex-1 py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors disabled:opacity-50">
              {addLoading ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Item Modal ─────────────────────────────────────────────────── */}
      {editItem && (
        <Modal title="Ürün Düzenle" onClose={() => setEditItem(null)}>
          <Field label="Ürün Adı *">
            <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} />
          </Field>
          <Field label="Kategori">
            <input className={inputCls} value={editCategory} onChange={e => setEditCategory(e.target.value)} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditItem(null)}
              className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
              İptal
            </button>
            <button onClick={handleEdit} disabled={editLoading}
              className="flex-1 py-2 rounded-lg text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50">
              {editLoading ? 'Kaydediliyor…' : 'Güncelle'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Add Variant Modal ──────────────────────────────────────────────── */}
      {variantItem && (
        <Modal title={`Varyant Ekle — ${variantItem.name}`} onClose={() => setVariantItem(null)}>
          <Field label="Etiket">
            <input className={inputCls} value={variantLabel} onChange={e => setVariantLabel(e.target.value)} placeholder="M, XL, Kırmızı…" />
          </Field>
          <Field label="Başlangıç Miktar">
            <input className={inputCls} type="number" min="0" value={variantQty} onChange={e => setVariantQty(e.target.value)} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setVariantItem(null)}
              className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
              İptal
            </button>
            <button onClick={handleAddVariant} disabled={variantLoading}
              className="flex-1 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50">
              {variantLoading ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Adjust Stock Modal ────────────────────────────────────────────── */}
      {adjustVariantRow && (
        <Modal
          title={`Stok Ayarla — ${adjustVariantRow.item.name}${adjustVariantRow.variant.variant_label ? ` / ${adjustVariantRow.variant.variant_label}` : ''}`}
          onClose={() => setAdjustVariantRow(null)}
        >
          <p className="text-xs text-app-muted">
            Mevcut stok: <span className="text-app-text font-semibold">{adjustVariantRow.variant.quantity}</span>
          </p>
          <Field label="Değişim Miktarı (+ ekle, − çıkar)">
            <input className={inputCls} type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} placeholder="+10 veya -5" />
          </Field>
          <Field label="Sebep">
            <input className={inputCls} value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Opsiyonel — Yeni alım, kayıp, sayım düzeltme…" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAdjustVariantRow(null)}
              className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
              İptal
            </button>
            <button onClick={handleAdjust} disabled={adjustLoading}
              className="flex-1 py-2 rounded-lg text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50">
              {adjustLoading ? 'Kaydediliyor…' : 'Uygula'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Assignments Detail Modal ──────────────────────────────────────── */}
      {detailVariant && (
        <Modal
          title={`Zimmetler — ${detailVariant.item.name}${detailVariant.variant.variant_label ? ` / ${detailVariant.variant.variant_label}` : ''}`}
          onClose={() => setDetailVariant(null)}
        >
          {detailLoading ? (
            <p className="text-sm text-app-muted text-center py-4">Yükleniyor…</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-app-muted text-center py-4">Zimmet kaydı yok.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--card-border)' }}>
                  <div>
                    <p className="font-medium text-app-text">{a.first_name} {a.last_name}</p>
                    <p className="text-xs text-app-muted">
                      {a.quantity} adet · {formatDate(a.assigned_at)}
                      {a.returned_at && ` → İade: ${formatDate(a.returned_at)}`}
                    </p>
                    {a.notes && <p className="text-xs text-app-muted mt-0.5">{a.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      a.status === 'assigned'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-app-accent-soft text-app-muted'
                    }`}>
                      {a.status === 'assigned' ? 'Zimmetli' : 'İade'}
                    </span>
                    {isSuperAdmin && a.status === 'assigned' && (
                      <button onClick={() => handleReturn(a.id)}
                        className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        İade Al
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setDetailVariant(null)}
            className="w-full mt-2 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
            Kapat
          </button>
        </Modal>
      )}

      {/* ── Assign Modal ──────────────────────────────────────────────────── */}
      {assignVariantRow && (
        <Modal
          title={`Zimmet Ver — ${assignVariantRow.item.name}${assignVariantRow.variant.variant_label ? ` / ${assignVariantRow.variant.variant_label}` : ''}`}
          onClose={() => setAssignVariantRow(null)}
        >
          <p className="text-xs text-app-muted">
            Mevcut stok: <span className="text-app-text font-semibold">{assignVariantRow.variant.quantity}</span>
          </p>
          <Field label="Personel *">
            <select className={inputCls} value={assignStaffId} onChange={e => setAssignStaffId(e.target.value)}>
              <option value="">Seçin…</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}{s.department_name ? ` — ${s.department_name}` : ' — Gönüllü'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Adet *">
            <input className={inputCls} type="number" min="1" value={assignQty} onChange={e => setAssignQty(e.target.value)} />
          </Field>
          <Field label="Not">
            <input className={inputCls} value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Opsiyonel…" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAssignVariantRow(null)}
              className="flex-1 py-2 rounded-lg text-sm border border-app-border bg-app-base text-app-text hover:bg-app-accent-soft transition-colors">
              İptal
            </button>
            <button onClick={handleAssign} disabled={assignLoading}
              className="flex-1 py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors disabled:opacity-50">
              {assignLoading ? 'Kaydediliyor…' : 'Zimmet Ver'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
