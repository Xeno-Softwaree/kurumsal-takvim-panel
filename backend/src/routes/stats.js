const express = require('express');
const { get, all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

function getIstanbulYmd(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function getIstanbulWeekRangeUtc(now = new Date()) {
  const istYmd = getIstanbulYmd(now);
  const istStartOfDay = new Date(`${istYmd}T00:00:00+03:00`);

  // Determine weekday in Istanbul: 0=Sun .. 6=Sat
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'short',
  }).format(now);
  const map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[weekdayShort] ?? 0;

  // Monday-start week
  const daysSinceMonday = (dow + 6) % 7;
  const startOfWeek = new Date(
    istStartOfDay.getTime() - daysSinceMonday * 86400000
  );
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000);
  return {
    startIso: startOfWeek.toISOString(),
    endIso: endOfWeek.toISOString(),
  };
}

router.get('/', async (req, res) => {
  try {
    const totalEventsRow = await get('SELECT COUNT(*) as count FROM events');
    const activeAdminsRow = await get('SELECT COUNT(*) as count FROM admin_users');

    const { startIso, endIso } = getIstanbulWeekRangeUtc();
    const weekMeetingsRow = await get(
      `SELECT COUNT(*) as count
       FROM events
       WHERE type = 'Toplantı'
         AND date >= $1
         AND date < $2`,
      [startIso, endIso]
    );

    const now = new Date();
    const nowIso = now.toISOString();
    const next7Iso = new Date(now.getTime() + 7 * 86400000).toISOString();

    const activeEventsRow = await get(
      `SELECT COUNT(*) as count FROM events WHERE date >= $1`, [nowIso]
    );
    const upcomingEventsRow = await get(
      `SELECT COUNT(*) as count FROM events WHERE date >= $1 AND date < $2`, [nowIso, next7Iso]
    );
    const pastEventsRow = await get(
      `SELECT COUNT(*) as count FROM events WHERE date < $1`, [nowIso]
    );

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = thisMonthStart;

    const thisMonthEvents = await get('SELECT COUNT(*) as count FROM events WHERE created_at >= $1', [thisMonthStart]);
    const lastMonthEvents = await get('SELECT COUNT(*) as count FROM events WHERE created_at >= $1 AND created_at < $2', [lastMonthStart, lastMonthEnd]);

    const eventChange = Number(lastMonthEvents?.count) > 0
      ? Math.round(((Number(thisMonthEvents?.count) - Number(lastMonthEvents?.count)) / Number(lastMonthEvents?.count)) * 100)
      : 0;

    return res.json({
      totalEvents:    Number(totalEventsRow?.count)    || 0,
      activeEvents:   Number(activeEventsRow?.count)   || 0,
      upcomingEvents: Number(upcomingEventsRow?.count) || 0,
      pastEvents:     Number(pastEventsRow?.count)     || 0,
      weekMeetings:   Number(weekMeetingsRow?.count)   || 0,
      activeAdmins:   Number(activeAdminsRow?.count)   || 0,
      trends: {
        total:    null,
        active:   null,
        upcoming: null,
        past:     null,
        events:   eventChange,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

router.get('/heatmap', async (req, res) => {
  const days = Number(req.query.days) || 365;
  const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 365;

  try {
    const since = new Date(Date.now() - safeDays * 86400000).toISOString();
    const params = [since];
    let sql =
      "SELECT to_char(date, 'YYYY-MM-DD') AS day, COUNT(*) AS count FROM events WHERE status != 'cancelled' AND date >= $1";

    if (!req.admin.is_super_admin) {
      const idx = params.push(req.admin.id);
      sql += ` AND created_by_admin_id = $${idx}`;
    }

    sql += ' GROUP BY day ORDER BY day ASC';

    const rows = await all(sql, params);
    return res.json(
      (rows || []).map((r) => ({
        date: r.day,
        count: r.count || 0,
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: 'Heatmap verisi alınamadı' });
  }
});

module.exports = router;
