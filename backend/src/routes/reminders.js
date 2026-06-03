const express = require('express');
const { all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STAGE_LABELS = {
  '1h':  '1 saat önce',
  '2h':  '2 saat önce',
  '24h': '24 saat önce',
  '72h': '3 gün önce',
};

/* ── GET /api/reminders/upcoming ───────────────────── */
// Events in next 72h with their pending/delivered reminder stages
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const events = await all(
      `SELECT e.id, e.title, e.date, e.type, e.department
       FROM events e
       WHERE e.date >= $1 AND e.date < $2
         AND (e.is_active = true OR e.is_active IS NULL)
       ORDER BY e.date ASC`,
      [now.toISOString(), horizon.toISOString()]
    );

    if (!events || events.length === 0) return res.json([]);

    const eventIds = events.map((e) => e.id);
    const deliveries = await all(
      `SELECT event_id, stage FROM reminder_deliveries WHERE event_id = ANY($1::int[])`,
      [eventIds]
    );

    const delivered = {};
    for (const d of deliveries || []) {
      if (!delivered[d.event_id]) delivered[d.event_id] = [];
      delivered[d.event_id].push(d.stage);
    }

    const result = events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      type: ev.type || null,
      department: ev.department || null,
      deliveredStages: delivered[ev.id] || [],
    }));

    return res.json(result);
  } catch (err) {
    console.error('Reminders upcoming error:', err);
    return res.status(500).json({ error: 'Hatırlatıcı verisi alınamadı' });
  }
});

/* ── GET /api/reminders/history ───────────────────── */
// Recent 50 reminder deliveries
router.get('/history', async (req, res) => {
  try {
    const rows = await all(
      `SELECT rd.id, rd.event_id, rd.stage, rd.delivered_at,
              e.title AS event_title, e.date AS event_date, e.type AS event_type
       FROM reminder_deliveries rd
       LEFT JOIN events e ON e.id = rd.event_id
       ORDER BY rd.delivered_at DESC
       LIMIT 50`,
      []
    );
    return res.json(rows || []);
  } catch (err) {
    console.error('Reminders history error:', err);
    return res.status(500).json({ error: 'Geçmiş verisi alınamadı' });
  }
});

module.exports = router;
