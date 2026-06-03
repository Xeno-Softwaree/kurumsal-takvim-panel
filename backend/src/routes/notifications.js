const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { verifyToken } = require('../utils/jwt');
const { addClient } = require('../services/sseManager');

const router = express.Router();

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events endpoint.  The browser can't send custom headers with
 * the native EventSource API, so we accept the JWT via query-string
 * (?token=...) in addition to the normal Authorization header.
 *
 * This route is NOT covered by the router-level requireAuth middleware so that
 * we can authenticate from the query param before we start the stream.
 */
router.get('/stream', (req, res) => {
  // 1. Resolve token from header or query param
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const queryToken  = typeof req.query.token === 'string' ? req.query.token : null;
  const rawToken    = headerToken || queryToken;

  if (!rawToken) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  let admin;
  try {
    const payload = verifyToken(rawToken);
    admin = { id: payload.adminId, email: payload.email };
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 2. Register SSE stream (sets headers + wires close handler)
  addClient(admin.id, res);

  // 3. Heartbeat every 25 s to prevent proxy / load-balancer timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  res.on('close', () => clearInterval(heartbeat));
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 200 ? limit : 50;

  try {
    const rows = await all(
      `SELECT id, admin_id, action, entity_type, entity_id, payload, is_read, created_at
       FROM notifications
       WHERE admin_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.admin.id, safeLimit, offset]
    );
    return res.json(rows || []);
  } catch (err) {
    return res.status(500).json({ error: 'Bildirimler alınamadı' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const row = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE admin_id = $1 AND is_read = false',
      [req.admin.id]
    );
    return res.json({ count: row?.count || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Bildirim sayısı alınamadı' });
  }
});

router.post('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await run(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND admin_id = $2',
      [id, req.admin.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Bildirim güncellenemedi' });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = true WHERE admin_id = $1', [req.admin.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Bildirimler güncellenemedi' });
  }
});

module.exports = router;
