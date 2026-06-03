const express = require('express');
const multer = require('multer');
const { UTApi, UTFile } = require('uploadthing/server');
const { run, get, all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const VALID_CATEGORIES = ['Genel', 'Tatbikat', 'Rapor', 'Prosedür', 'Diğer'];

// Memory storage — files go straight to UploadThing, never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü. PDF, Office dokümanları ve resimler kabul edilir.'));
    }
  },
});

function getUtApi() {
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error('UPLOADTHING_TOKEN ortam değişkeni ayarlanmamış.');
  }
  return new UTApi({ token: process.env.UPLOADTHING_TOKEN });
}

/* ── POST /api/documents ─────────────────────────────────────────────────── */
router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Dosya hatası', detail: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi' });

    let originalName = req.file.originalname;
    try {
      const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
      if (!decoded.includes('\uFFFD')) originalName = decoded;
    } catch { /* ignore */ }

    const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'Genel';

    try {
      const utapi = getUtApi();
      const utFile = new UTFile([req.file.buffer], originalName, { type: req.file.mimetype });
      const result = await utapi.uploadFiles(utFile);

      if (result.error) {
        // eslint-disable-next-line no-console
        console.error('UploadThing error:', result.error);
        return res.status(500).json({ error: 'Bulut depolama hatası', detail: result.error.message });
      }

      const { url: fileUrl, key: fileKey, size: fileSize } = result.data;

      const doc = await get(
        `INSERT INTO documents (admin_id, original_name, file_url, file_key, mime_type, file_size, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, original_name, file_url, mime_type, file_size, category, created_at`,
        [req.admin.id, originalName, fileUrl, fileKey, req.file.mimetype, fileSize, category]
      );

      await run(
        `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.admin.id, 'document_uploaded', 'document', doc.id,
          JSON.stringify({ file_name: originalName, category })]
      );

      return res.status(201).json({ message: 'Doküman yüklendi', document: doc });
    } catch (uploadErr) {
      // eslint-disable-next-line no-console
      console.error('Upload error:', uploadErr);
      return res.status(500).json({ error: 'Yükleme hatası', detail: uploadErr.message });
    }
  });
});

/* ── GET /api/documents ──────────────────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, category } = req.query;
    const params = [];
    const conditions = [];

    if (category && VALID_CATEGORIES.includes(String(category))) {
      params.push(String(category));
      conditions.push(`d.category = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search)}%`);
      conditions.push(`d.original_name ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const documents = await all(`
      SELECT d.id, d.original_name, d.file_url, d.mime_type, d.file_size, d.category, d.created_at,
             a.email AS admin_email
      FROM documents d
      LEFT JOIN admin_users a ON d.admin_id = a.id
      ${where}
      ORDER BY d.created_at DESC
    `, params);

    return res.json(documents || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Dokümanlar listelenemedi' });
  }
});

/* ── PATCH /api/documents/:id/category ──────────────────────────────────── */
router.patch('/:id/category', requireAuth, async (req, res) => {
  const { category } = req.body;
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Geçersiz kategori' });
  }
  try {
    await run(`UPDATE documents SET category = $1 WHERE id = $2`, [category, req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Kategori güncellenemedi' });
  }
});

/* ── DELETE /api/documents/:id ───────────────────────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await get(`SELECT * FROM documents WHERE id = $1`, [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doküman bulunamadı' });

    if (doc.admin_id !== req.admin.id && !req.admin.is_super_admin) {
      return res.status(403).json({ error: 'Bu dokümanı sadece yükleyen veya süper admin silebilir' });
    }

    // Delete from UploadThing cloud
    if (doc.file_key) {
      try {
        const utapi = getUtApi();
        await utapi.deleteFiles([doc.file_key]);
      } catch (utErr) {
        // eslint-disable-next-line no-console
        console.warn('UploadThing deletion warning:', utErr.message);
        // Continue anyway — remove from DB regardless
      }
    }

    await run(`DELETE FROM documents WHERE id = $1`, [doc.id]);

    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.admin.id, 'document_deleted', 'document', doc.id,
        JSON.stringify({ file_name: doc.original_name })]
    );

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Silme hatası' });
  }
});

module.exports = router;
