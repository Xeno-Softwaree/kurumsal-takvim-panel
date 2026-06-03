const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validation');
const { sendMail } = require('../services/mailer');
const { sendEventCreatedMail, sendEventReminderMail } = require('../services/mail');
const { createNotificationForAllAdminUsers } = require('../services/notifications');

const router = express.Router();

router.use(requireAuth);
router.get('/', async (req, res) => {
  const {
    year,
    adminId,
    start,
    end,
    search,
    department,
    status,
    includeAdmin,
    limit,
    offset,
  } = req.query;
  const params = [];
  const withAdmin = String(includeAdmin || '') === '1';

  let sql = withAdmin
    ? 'SELECT events.id, events.title, events.description, events.date, events.label, events.participant_count AS "participantCount", events.type, events.department, events.status, events.reminder_sent, events.recurrence_rule, events.created_by_admin_id, events.created_at, events.updated_at, admin_users.email AS admin_email FROM events LEFT JOIN admin_users ON events.created_by_admin_id = admin_users.id'
    : 'SELECT events.id, events.title, events.description, events.date, events.label, events.participant_count AS "participantCount", events.type, events.department, events.status, events.reminder_sent, events.recurrence_rule, events.created_by_admin_id, events.created_at, events.updated_at FROM events';

  const conditions = [];

  const addCond = (template, value) => {
    const idx = params.push(value);
    conditions.push(template.replace('?', `$${idx}`));
  };
  if (start && end) {
    // Always include recurring events regardless of their base date so the
    // frontend can expand them into the visible range.
    const i1 = params.push(String(start));
    const i2 = params.push(String(end));
    conditions.push(`((date >= $${i1} AND date < $${i2}) OR recurrence_rule IS NOT NULL)`);
  } else if (year) {
    addCond('EXTRACT(YEAR FROM date) = ?', String(year));
  }

  if (adminId) {
    addCond('created_by_admin_id = ?', String(adminId));
  }

  if (department) {
    addCond('department = ?', String(department));
  }



  const typeParam = req.query.type;
  if (typeParam) {
    const qValue = String(typeParam).trim();
    if (qValue && qValue !== '') {
      const idx = params.push(qValue);
      conditions.push(`(events.type ILIKE $${idx} OR events.label ILIKE $${idx})`);
    }
  }

  if (search) {
    const q = `%${String(search)}%`;
    const i1 = params.push(q);
    const i2 = params.push(q);
    conditions.push(`(title LIKE $${i1} OR description LIKE $${i2})`);
  }

  const nowIso = new Date().toISOString();
  if (status === 'past') {
    addCond('date < ?', nowIso);
    conditions.push("status != 'cancelled'");
  }
  if (status === 'future') {
    addCond('date >= ?', nowIso);
    conditions.push("status != 'cancelled'");
  }

  if (conditions.length) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY date ASC';

  const lim = Number(limit);
  const off = Number(offset) || 0;
  if (Number.isFinite(lim) && lim > 0) {
    const idx = params.push(lim);
    sql += ` LIMIT $${idx}`;
    const j = params.push(off);
    sql += ` OFFSET $${j}`;
  }

  try {
    const events = await all(sql, params);
    return res.json(events);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etkinlikler alınamadı' });
  }
});

router.get('/upcoming', async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const offset = Number(req.query.offset) || 0;
  const { department, search } = req.query;
  try {
    const conditions = [];
    const params = [];
    const i0 = params.push(new Date().toISOString());
    conditions.push(`date >= $${i0}`);
    conditions.push("status != 'cancelled'");
    if (department) {
      const idx = params.push(String(department));
      conditions.push(`department = $${idx}`);
    }
    if (search) {
      const q = `%${String(search)}%`;
      const i1 = params.push(q);
      const i2 = params.push(q);
      conditions.push(`(title LIKE $${i1} OR description LIKE $${i2})`);
    }
    const i3 = params.push(limit);
    const i4 = params.push(offset);

    const events = await all(
      `SELECT events.id, events.title, events.description, events.date, events.label, events.participant_count AS "participantCount", events.type, events.department, events.status, events.reminder_sent, events.created_by_admin_id, events.created_at, events.updated_at FROM events
       WHERE ${conditions.join(' AND ')}
       ORDER BY date ASC
       LIMIT $${i3} OFFSET $${i4}`,
      params
    );
    return res.json(events);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Yaklaşan etkinlikler alınamadı' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const event = await get(
      'SELECT id, title, description, date, label, participant_count AS "participantCount", type, department, status, reminder_sent, recurrence_rule, created_by_admin_id, created_at, updated_at FROM events WHERE id = $1',
      [id]
    );
    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    return res.json(event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etkinlik alınamadı' });
  }
});

router.post('/', validateEvent, async (req, res) => {
  const { title, description, type, department, date, status, participantCount, recurrence_rule } = req.body;
  const validRules = ['daily', 'weekly', 'monthly', 'yearly'];
  const rrule = validRules.includes(recurrence_rule) ? recurrence_rule : null;
  const now = new Date().toISOString();

  try {
    const inserted = await get(
      `INSERT INTO events (title, description, type, department, participant_count, date, status, reminder_sent, recurrence_rule, created_by_admin_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, $10, $11)
       RETURNING id`,
      [
        title,
        description,
        type,
        department || null,
        participantCount || 0,
        date,
        status || 'upcoming',
        rrule,
        req.admin.id,
        now,
        now,
      ]
    );

    try {
      await createNotificationForAllAdminUsers({
        action: 'CREATE_EVENT',
        entityType: 'event',
        entityId: inserted.id,
        payload: {
          message: `${req.admin.email} kullanıcısı "${title}" etkinliğini oluşturdu.`,
          title,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create notifications for CREATE_EVENT:', err);
    }

    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.admin.id,
        'CREATE_EVENT',
        'event',
        inserted.id,
        JSON.stringify({
          message: `${req.admin.email} kullanıcısı "${title}" etkinliğini oluşturdu.`,
          title,
        }),
        now,
      ]
    );

    const created = await get(
      'SELECT id, title, description, date, label, participant_count AS "participantCount", type, department, status, reminder_sent, recurrence_rule, created_by_admin_id, created_at, updated_at FROM events WHERE id = $1',
      [inserted.id]
    );

    try {
      const rows = await all('SELECT email FROM admin_users');
      const recipients = (rows || []).map((r) => r && r.email).filter(Boolean);
      if (recipients.length) {
        setImmediate(() => {
          sendEventCreatedMail(recipients, created).catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('Failed to send create event notification email:', err);
          });
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send create event notification email:', err);
    }

    return res.status(201).json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etkinlik oluşturulamadı' });
  }
});

router.put('/:id', validateEvent, async (req, res) => {
  const { id } = req.params;
  const { title, description, type, department, date, status, participantCount, recurrence_rule } = req.body;
  const validRules = ['daily', 'weekly', 'monthly', 'yearly'];
  const rrule = recurrence_rule === null || recurrence_rule === '' ? null
    : validRules.includes(recurrence_rule) ? recurrence_rule
    : undefined; // undefined → don't change (shouldn't happen)

  try {
    const existing = await get('SELECT * FROM events WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    }
    const now = new Date().toISOString();
    await run(
      `UPDATE events
       SET title = $1, description = $2, type = $3, department = $4, participant_count = $5, date = $6, status = $7, recurrence_rule = $8, updated_at = $9
       WHERE id = $10`,
      [
        title,
        description,
        type,
        department || null,
        participantCount || 0,
        date,
        status || existing.status,
        rrule !== undefined ? rrule : existing.recurrence_rule,
        now,
        id,
      ]
    );

    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.admin.id,
        'UPDATE_EVENT',
        'event',
        id,
        JSON.stringify({
          message: `${req.admin.email} kullanıcısı "${title}" etkinliğini güncelledi.`,
          title,
        }),
        now,
      ]
    );

    try {
      await createNotificationForAllAdminUsers({
        action: 'UPDATE_EVENT',
        entityType: 'event',
        entityId: Number(id),
        payload: {
          message: `${req.admin.email} kullanıcısı "${title}" etkinliğini güncelledi.`,
          title,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create notifications for UPDATE_EVENT:', err);
    }

    const updated = await get(
      'SELECT events.*, events.participant_count AS "participantCount" FROM events WHERE id = $1',
      [id]
    );

    if (existing.date !== date) {
      try {
        const rows = await all('SELECT email FROM admin_users');
        const to = (rows || [])
          .map((r) => r && r.email)
          .filter(Boolean)
          .join(',');
        if (to) {
          await sendMail({
            to,
            subject: `Etkinlik Tarihi Güncellendi: ${title}`,
            text: `Bir etkinliğin tarihi güncellendi.\n\nBaşlık: ${title}\nEski Tarih: ${new Date(
              existing.date
            ).toLocaleString('tr-TR')}\nYeni Tarih: ${new Date(
              date
            ).toLocaleString('tr-TR')}\nKategori: ${type || existing.type || '-'}\nKatılımcı Sayısı: ${participantCount || existing.participant_count || 0
              }\n\nGüncelleyen: ${req.admin.email}`,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to send date change notification email:', err);
      }
    }

    return res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etkinlik güncellenemedi' });
  }
});

router.post('/:id/send-reminder', async (req, res) => {
  const { id } = req.params;
  const { adminIds, emails } = req.body || {};

  const MAX_RECIPIENTS = 25;

  const isValidEmail = (value) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  try {
    const event = await get('SELECT id, title, date FROM events WHERE id = $1', [id]);
    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });

    const resolved = new Set();
    if (Array.isArray(emails)) {
      emails
        .map((e) => (typeof e === 'string' ? e.trim() : ''))
        .filter(isValidEmail)
        .forEach((e) => resolved.add(e));
    }

    if (Array.isArray(adminIds) && adminIds.length) {
      const ids = adminIds
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (ids.length) {
        const base = params => params.length;
        const tmp = [];
        ids.forEach((val) => {
          tmp.push(`$${tmp.length + 1}`);
        });
        const rows = await all(
          `SELECT email FROM admin_users WHERE id IN (${tmp.join(',')})`,
          ids
        );
        (rows || [])
          .map((r) => r && r.email)
          .filter(Boolean)
          .forEach((e) => resolved.add(e));
      }
    }

    if (resolved.size === 0) {
      return res
        .status(400)
        .json({ error: 'Gönderilecek alıcı bulunamadı (geçerli e-posta yok)' });
    }

    if (resolved.size > MAX_RECIPIENTS) {
      return res.status(400).json({
        error: `Tek seferde en fazla ${MAX_RECIPIENTS} alıcıya gönderim yapılabilir`,
      });
    }

    const recipients = Array.from(resolved);
    await sendEventReminderMail(recipients, event);

    const now = new Date().toISOString();
    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.admin.id,
        'SEND_REMINDER',
        'event',
        id,
        JSON.stringify({
          message: `${req.admin.email} kullanıcısı "${event.title}" etkinliği için hatırlatıcı gönderdi.`,
          to: recipients.join(','),
        }),
        now,
      ]
    );

    try {
      await createNotificationForAllAdminUsers({
        action: 'SEND_REMINDER',
        entityType: 'event',
        entityId: Number(id),
        payload: {
          message: `${req.admin.email} kullanıcısı "${event.title}" etkinliği için hatırlatıcı gönderdi.`,
          title: event.title,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create notifications for SEND_REMINDER:', err);
    }

    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Send reminder failed:', {
      eventId: id,
      adminId: req.admin?.id,
      message: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({
      error: 'Hatırlatıcı gönderilemedi',
      detail: err?.message || String(err),
    });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await get('SELECT id, title FROM events WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    }

    await run('DELETE FROM reminder_deliveries WHERE event_id = $1', [id]);
    await run('DELETE FROM events WHERE id = $1', [id]);

    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.admin.id,
        'DELETE_EVENT',
        'event',
        id,
        JSON.stringify({
          message: `${req.admin.email} kullanıcısı "${existing.title}" etkinliğini sildi.`,
          title: existing.title,
        }),
        new Date().toISOString(),
      ]
    );

    try {
      await createNotificationForAllAdminUsers({
        action: 'DELETE_EVENT',
        entityType: 'event',
        entityId: Number(id),
        payload: {
          message: `${req.admin.email} kullanıcısı "${existing.title}" etkinliğini sildi.`,
          title: existing.title,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create notifications for CANCEL_EVENT:', err);
    }

    return res.status(204).send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Etkinlik iptal edilemedi' });
  }
});

module.exports = router;
