const express = require('express');
const { all } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/', async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  try {
    const logs = await all(
      `SELECT activity_logs.id, activity_logs.admin_id, activity_logs.action, activity_logs.entity_type, activity_logs.entity_id, activity_logs.meta, activity_logs.created_at, admin_users.email AS admin_email
       FROM activity_logs
       LEFT JOIN admin_users ON activity_logs.admin_id = admin_users.id
       ORDER BY activity_logs.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json(logs);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'İşlem logları alınamadı' });
  }
});

module.exports = router;
