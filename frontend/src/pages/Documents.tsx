import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, Download, Eye, EyeOff, FileSpreadsheet, FileText,
  Image as ImageIcon, Loader2, MoreHorizontal, Search,
  Shield, Trash2, UploadCloud, X, AlertCircle, FolderOpen,
  RefreshCw, Tag,
} from 'lucide-react';
import {
  deleteDocument, getDocuments, DOCUMENT_CATEGORIES,
  updateDocumentCategory, uploadDocument,
  type Document, type DocumentCategory,
} from '../api/documents';
import { useAuth } from '../auth/AuthContext';

/* ── helpers ────────────────────────────────────────────────────────────── */
function formatSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mime: string): 'pdf' | 'word' | 'excel' | 'ppt' | 'image' | 'other' {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word')) return 'word';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'excel';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'ppt';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

const FILE_ICON: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  pdf:   { icon: <FileText   className="h-5 w-5" />, bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
  word:  { icon: <FileText   className="h-5 w-5" />, bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa' },
  excel: { icon: <FileSpreadsheet className="h-5 w-5" />, bg: 'rgba(16,185,129,0.1)', color: '#34d399' },
  ppt:   { icon: <FileText   className="h-5 w-5" />, bg: 'rgba(249,115,22,0.1)',  color: '#fb923c' },
  image: { icon: <ImageIcon  className="h-5 w-5" />, bg: 'rgba(168,85,247,0.1)',  color: '#c084fc' },
  other: { icon: <MoreHorizontal className="h-5 w-5" />, bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Tümü:     <FolderOpen className="h-3.5 w-3.5" />,
  Genel:    <Tag        className="h-3.5 w-3.5" />,
  Tatbikat: <Shield     className="h-3.5 w-3.5" />,
  Rapor:    <FileText   className="h-3.5 w-3.5" />,
  Prosedür: <BookOpen   className="h-3.5 w-3.5" />,
  Diğer:    <MoreHorizontal className="h-3.5 w-3.5" />,
};

function getPreviewUrl(doc: Document): string | null {
  if (!doc.file_url) return null;
  const type = getFileType(doc.mime_type);
  if (type === 'pdf' || type === 'image') return doc.file_url;
  // Word, Excel, PPT → Microsoft Office Online Viewer
  if (['word', 'excel', 'ppt'].includes(type)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.file_url)}`;
  }
  return null;
}

/* ── Preview Drawer ─────────────────────────────────────────────────────── */
function PreviewDrawer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const type = getFileType(doc.mime_type);
  const previewUrl = getPreviewUrl(doc);
  const fi = FILE_ICON[type] || FILE_ICON.other;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[680px] flex-col overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: fi.bg, color: fi.color }}
            >
              {fi.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-700 max-w-[400px]" style={{ color: 'var(--app-text)' }}>
                {doc.original_name}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                {formatSize(doc.file_size)} · {doc.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.file_url && (
              <a
                href={doc.file_url}
                download={doc.original_name}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-600 transition"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Download className="h-3.5 w-3.5" />
                İndir
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/8"
              style={{ color: 'var(--app-text-muted)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          {!previewUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-3" style={{ color: 'var(--app-text-muted)' }}>
              <EyeOff className="h-10 w-10 opacity-30" />
              <p className="text-[13px]">Bu dosya türü önizlenemiyor.</p>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  download={doc.original_name}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-600 text-white transition"
                  style={{ background: 'rgba(59,130,246,0.8)' }}
                >
                  <Download className="h-4 w-4" />
                  Dosyayı İndir
                </a>
              )}
            </div>
          ) : type === 'image' ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img
                src={previewUrl}
                alt={doc.original_name}
                className="max-h-full max-w-full rounded-lg object-contain"
                style={{ boxShadow: 'var(--shadow-lg)' }}
              />
            </div>
          ) : (
            <iframe
              src={previewUrl}
              title={doc.original_name}
              className="h-full w-full border-0"
              allow="fullscreen"
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Documents() {
  const { admin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tümü');
  const [uploadCategory, setUploadCategory] = useState<string>('Genel');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── filtered list ── */
  const filtered = documents.filter((d) => {
    const matchCat = activeCategory === 'Tümü' || d.category === activeCategory;
    const q = searchText.trim().toLowerCase();
    const matchSearch = !q || d.original_name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const counts = documents.reduce<Record<string, number>>((acc, d) => {
    acc['Tümü'] = (acc['Tümü'] || 0) + 1;
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

  /* ── upload ── */
  const doUpload = useCallback(async (file: File) => {
    setUploadError('');
    setUploading(true);
    setUploadProgress(`"${file.name}" yükleniyor…`);
    try {
      const doc = await uploadDocument(file, uploadCategory);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || err?.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [uploadCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  /* ── category change ── */
  const handleCategoryChange = async (id: number, category: string) => {
    setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, category } : d));
    try {
      await updateDocumentCategory(id, category);
    } catch {
      load(); // revert on error
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteId));
      if (previewDoc?.id === deleteId) setPreviewDoc(null);
      setDeleteId(null);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || 'Silme başarısız');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (doc: Document) =>
    admin?.is_super_admin || doc.admin_email === admin?.email;

  /* ── render ── */
  const inputCls = `block w-full rounded-lg py-2 px-3 text-[12px] outline-none transition`
    + ` border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400/60`;
  const inputStyle = { background: 'var(--app-bg)', borderColor: 'var(--card-border)', color: 'var(--app-text)' };

  return (
    <div className="space-y-5 page-enter">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[15px] font-700" style={{ color: 'var(--app-text)' }}>Dökümanlar</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
            {documents.length} dosya · UploadThing bulut depolama
          </p>
        </div>

        {/* Upload controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, width: 130 }}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            id="doc-upload"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label
            htmlFor="doc-upload"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-600 text-white transition cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : 'hover:opacity-90'}`}
            style={{ background: 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.4)' }}
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <UploadCloud className="h-3.5 w-3.5" />
            }
            {uploading ? 'Yükleniyor…' : 'Dosya Yükle'}
          </label>
        </div>
      </div>

      {/* ── Drag zone (visible when dragging) ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center py-5 text-[12px] font-500"
        style={{
          borderColor: dragOver ? 'rgba(99,102,241,0.6)' : 'var(--card-border)',
          background: dragOver ? 'rgba(99,102,241,0.05)' : 'transparent',
          color: dragOver ? '#818cf8' : 'var(--app-text-muted)',
        }}
      >
        <UploadCloud className="mr-2 h-4 w-4" />
        {uploadProgress || 'Dosyayı buraya sürükleyip bırakın'}
      </div>

      {/* ── Error ── */}
      {uploadError && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-500"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
          <button type="button" onClick={() => setUploadError('')} className="ml-auto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Search + Category tabs ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5" style={{ color: 'var(--app-text-muted)' }} />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Dosya adı ara…"
            className="block w-full rounded-lg border py-2 pl-9 pr-3 text-[12px] outline-none transition focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400/60"
            style={inputStyle}
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {['Tümü', ...DOCUMENT_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-600 transition"
              style={
                activeCategory === cat
                  ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'var(--app-bg)', color: 'var(--app-text-muted)', border: '1px solid var(--card-border)' }
              }
            >
              {CATEGORY_ICONS[cat]}
              {cat}
              {counts[cat] !== undefined && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-700"
                  style={{ background: activeCategory === cat ? 'rgba(99,102,241,0.25)' : 'var(--card-bg)' }}
                >
                  {counts[cat]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Document list ── */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--app-text-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--app-text-muted)' }}>
            <FolderOpen className="h-10 w-10 opacity-20" />
            <p className="text-[13px]">
              {searchText || activeCategory !== 'Tümü' ? 'Sonuç bulunamadı' : 'Henüz dosya yüklenmedi'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['Dosya', 'Kategori', 'Boyut', 'Yükleyen', 'Tarih', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-700 uppercase tracking-wider"
                    style={{ color: 'var(--app-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const type = getFileType(doc.mime_type);
                const fi = FILE_ICON[type] || FILE_ICON.other;
                const isDeleting = deleteId === doc.id;

                return (
                  <tr
                    key={doc.id}
                    className="group transition-colors"
                    style={{
                      borderBottom: '1px solid var(--card-border)',
                      background: isDeleting ? 'rgba(244,63,94,0.04)' : undefined,
                    }}
                  >
                    {/* File name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: fi.bg, color: fi.color }}
                        >
                          {fi.icon}
                        </div>
                        <span
                          className="text-[12px] font-600 max-w-[200px] truncate"
                          style={{ color: 'var(--app-text)' }}
                          title={doc.original_name}
                        >
                          {doc.original_name}
                        </span>
                      </div>
                    </td>

                    {/* Category — inline editable */}
                    <td className="px-4 py-3">
                      <select
                        value={doc.category || 'Genel'}
                        onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
                        className="rounded-md px-2 py-1 text-[11px] font-600 outline-none transition cursor-pointer"
                        style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                      >
                        {DOCUMENT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--app-text-muted)' }}>
                      {formatSize(doc.file_size)}
                    </td>

                    {/* Uploader */}
                    <td className="px-4 py-3 text-[12px] max-w-[140px] truncate" style={{ color: 'var(--app-text-muted)' }}>
                      {doc.admin_email || '—'}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: 'var(--app-text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-600" style={{ color: '#fda4af' }}>Emin misin?</span>
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-700 text-white transition disabled:opacity-60"
                            style={{ background: '#dc2626' }}
                          >
                            {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                            Sil
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="rounded-md px-2 py-1 text-[11px] font-600 transition hover:opacity-80"
                            style={{ color: 'var(--app-text-muted)', border: '1px solid var(--card-border)' }}
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          {/* Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition"
                            style={{ color: 'var(--app-text-muted)' }}
                            title="Önizle"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Download */}
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              download={doc.original_name}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg transition"
                              style={{ color: 'var(--app-text-muted)' }}
                              title="İndir"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* Delete */}
                          {canDelete(doc) && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(doc.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:text-rose-400"
                              style={{ color: 'var(--app-text-muted)' }}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Refresh ── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-500 transition hover:opacity-80"
          style={{ color: 'var(--app-text-muted)', border: '1px solid var(--card-border)', background: 'var(--app-bg)' }}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* ── Preview Drawer ── */}
      {previewDoc && (
        <PreviewDrawer doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
