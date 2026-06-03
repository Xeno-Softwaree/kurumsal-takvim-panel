const express = require('express');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { getSetting, setSetting } = require('../db/settings');

const router = express.Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/labels') {
    return next();
  }
  return requireSuperAdmin(req, res, next);
});

router.get('/mail', async (req, res) => {
  try {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
    const masked = apiKey ? '********' : '';
    return res.json({
      mode: apiKey && senderEmail ? 'api' : 'smtp',
      apiKey: masked,
      senderEmail,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Mail ayarları alınamadı' });
  }
});

router.put('/mail', async (req, res) => {
  try {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
    return res.json({
      mode: apiKey && senderEmail ? 'api' : 'smtp',
      apiKey: apiKey ? '********' : '',
      senderEmail,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Mail ayarları güncellenemedi' });
  }
});

router.get('/labels', async (req, res) => {
  try {
    const raw = await getSetting('event_labels');
    if (!raw) {
      // Return empty array - labels must be created via admin panel
      return res.json([]);
    }
    try {
      const parsed = JSON.parse(raw);
      return res.json(Array.isArray(parsed) ? parsed : []);
    } catch {
      // Invalid JSON - return empty array
      return res.json([]);
    }
  } catch (err) {
    console.error('Labels error:', err);
    return res.status(500).json({ error: 'Etiketler alınamadı' });
  }
});

router.put('/labels', async (req, res) => {
  const { labels } = req.body || {};
  if (!Array.isArray(labels)) {
    return res.status(400).json({ error: 'Geçersiz etiket listesi' });
  }

  const normalized = labels
    .map((x) => {
      const name = typeof x?.name === 'string' ? x.name.trim() : '';
      const pill = typeof x?.pill === 'string' ? x.pill.trim() : '';
      const color = typeof x?.color === 'string' ? x.color.trim() : '';
      return name ? { name, pill, color } : null;
    })
    .filter(Boolean);

  try {
    await setSetting('event_labels', JSON.stringify(normalized));
    return res.json(normalized);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etiketler kaydedilemedi' });
  }
});

module.exports = router;
