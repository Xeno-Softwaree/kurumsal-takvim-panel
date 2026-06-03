const { all, run } = require('../db');
const { broadcast } = require('./sseManager');

async function createNotification({ adminId, action, entityType, entityId, payload }) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO notifications (admin_id, action, entity_type, entity_id, payload, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, $6)`,
    [
      adminId,
      action,
      entityType || null,
      typeof entityId === 'number' ? entityId : entityId ? Number(entityId) : null,
      payload ? JSON.stringify(payload) : null,
      now,
    ]
  );

  // Push to any open SSE streams for this admin immediately
  broadcast(adminId, {
    action,
    entityType: entityType || null,
    entityId: entityId || null,
    payload: payload || null,
    is_read: false,
    created_at: now,
  });
}

async function createNotificationForAllAdminUsers({ action, entityType, entityId, payload }) {
  const admins = await all('SELECT id FROM admin_users WHERE is_active = true');
  const ids = (admins || []).map((a) => a && a.id).filter(Boolean);
  // eslint-disable-next-line no-restricted-syntax
  for (const adminId of ids) {
    // eslint-disable-next-line no-await-in-loop
    await createNotification({ adminId, action, entityType, entityId, payload });
  }
}

module.exports = {
  createNotification,
  createNotificationForAllAdminUsers,
  // Backward-compatible alias used by scheduler
  createNotificationForAllAdmins: createNotificationForAllAdminUsers,
};
