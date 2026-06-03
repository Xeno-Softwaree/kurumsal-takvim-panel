const cron = require('node-cron');
const { all, run } = require('../db');
const { defaultAdminEmail } = require('../config/env');
const { sendDailySummaryMail } = require('./mail');
const { sendMail } = require('./mailer');
const { createNotificationForAllAdmins } = require('./notifications');

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

function getIstanbulDayRangeUtc(now = new Date()) {
  const ymd = getIstanbulYmd(now);
  const start = new Date(`${ymd}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 86400000);
  return { startIso: start.toISOString(), endIso: end.toISOString(), ymd };
}

async function processReminders() {
  try {
    const now = new Date();
    const windowMs = 15 * 60 * 1000;

    const rules = {
      Toplantı: [
        { key: '24h', offsetMs: 24 * 60 * 60 * 1000, label: '24 saat' },
        { key: '2h', offsetMs: 2 * 60 * 60 * 1000, label: '2 saat' },
        { key: '1h', offsetMs: 60 * 60 * 1000, label: '1 saat' },
      ],
      Görev: [
        { key: '72h', offsetMs: 72 * 60 * 60 * 1000, label: '3 gün' },
        { key: '24h', offsetMs: 24 * 60 * 60 * 1000, label: '1 gün' },
        { key: '2h', offsetMs: 2 * 60 * 60 * 1000, label: '2 saat' },
      ],
      Önemli: [
        { key: '24h', offsetMs: 24 * 60 * 60 * 1000, label: '24 saat' },
        { key: '2h', offsetMs: 2 * 60 * 60 * 1000, label: '2 saat' },
        { key: '1h', offsetMs: 60 * 60 * 1000, label: '1 saat' },
      ],
      default: [
        { key: '24h', offsetMs: 24 * 60 * 60 * 1000, label: '24 saat' },
        { key: '2h', offsetMs: 2 * 60 * 60 * 1000, label: '2 saat' },
      ],
    };

    const admins = await all(
      'SELECT email FROM admin_users ORDER BY role DESC, created_at ASC'
    );
    const emails = (admins || []).map((a) => a && a.email).filter(Boolean);

    const stageList = [];
    Object.keys(rules).forEach((k) => {
      if (k === 'default') return;
      rules[k].forEach((s) => stageList.push({ ...s, type: k }));
    });
    rules.default.forEach((s) => stageList.push({ ...s, type: null }));

    // eslint-disable-next-line no-restricted-syntax
    for (const stage of stageList) {
      const start = new Date(now.getTime() + stage.offsetMs);
      const end = new Date(start.getTime() + windowMs);

      const params = [start.toISOString(), end.toISOString()];
      let sql =
        `SELECT id, title, date, type, participant_count, department
         FROM events
         WHERE is_active = true
           AND date >= $1 AND date < $2`;

      if (stage.type) {
        const idx = params.push(stage.type);
        sql += ` AND type = $${idx}`;
      } else {
        sql += " AND (type IS NULL OR type = '' OR type NOT IN ('Toplantı','Görev','Önemli'))";
      }

      const events = await all(sql, params);
      if (!events || events.length === 0) continue;

      // eslint-disable-next-line no-restricted-syntax
      for (const event of events) {
        // skip if already delivered for this stage
        // eslint-disable-next-line no-await-in-loop
        const delivered = await all(
          'SELECT id FROM reminder_deliveries WHERE event_id = $1 AND stage = $2 LIMIT 1',
          [event.id, stage.key]
        );
        if (delivered && delivered.length) continue;

        const subject = `Hatırlatıcı: ${event.title} (${stage.label} kaldı)`;
        const text = `Etkinlik hatırlatması (${stage.label} kaldı).\n\nBaşlık: ${event.title}\nTarih: ${new Date(
          event.date
        ).toLocaleString('tr-TR')}\nKategori: ${event.type || '-'}\nKatılımcı Sayısı: ${
          Number.isFinite(Number(event.participant_count))
            ? Number(event.participant_count)
            : 0
        }\nDepartman: ${event.department || '-'}`;

        try {
          if (emails.length) {
            // eslint-disable-next-line no-await-in-loop
            await sendMail({
              to: emails.join(','),
              subject,
              text,
            });
          }

          // eslint-disable-next-line no-await-in-loop
          await run(
`INSERT INTO reminder_deliveries (event_id, stage, delivered_at)
          VALUES ($1, $2, $3)
          ON CONFLICT(event_id, stage) DO NOTHING`,
            [event.id, stage.key, new Date().toISOString()]
          );

          try {
            // eslint-disable-next-line no-await-in-loop
            await createNotificationForAllAdmins({
              action: 'AUTO_REMINDER',
              entityType: 'event',
              entityId: event.id,
              payload: {
                message: `"${event.title}" etkinliği için otomatik hatırlatıcı (${stage.label} kaldı).`,
                title: event.title,
                stage: stage.key,
              },
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to create notifications for AUTO_REMINDER:', err);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Cron reminder send error:', {
            eventId: event.id,
            stage: stage.key,
            message: err?.message,
            code: err?.code,
            detail: err?.detail,
          });
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Cron reminder error:', err);
  }
}

async function processDailySummary() {
  try {
    const { startIso, endIso, ymd } = getIstanbulDayRangeUtc();
    const events = await all(
      `SELECT id, title, date, label, participant_count, type, department, status
       FROM events
       WHERE date >= $1
          AND date < $2
          AND is_active = true
       ORDER BY date ASC`,
      [startIso, endIso]
    );

    const label = new Date(`${ymd}T00:00:00+03:00`).toLocaleDateString('tr-TR');
    await sendDailySummaryMail(defaultAdminEmail, label, events);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Cron daily summary error:', err);
  }
}

async function processRetention() {
  try {
    await run(`DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '30 days'`);
  } catch (err) {
    console.error('Retention job error:', err);
  }
}

function startScheduler() {
  // Every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    processReminders();
  });

  // Every day 09:00 (Europe/Istanbul)
  cron.schedule(
    '0 9 * * *',
    () => {
      processDailySummary();
    },
    {
      timezone: 'Europe/Istanbul',
    }
  );

  cron.schedule('30 3 * * *', () => {
    processRetention();
  });
}

module.exports = {
  startScheduler,
  processReminders,
  processDailySummary,
  processRetention,
};
