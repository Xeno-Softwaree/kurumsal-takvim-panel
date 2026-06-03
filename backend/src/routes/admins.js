const express = require('express');
const { all, run, get } = require('../db');
const { validateAdminCreate } = require('../middleware/validation');
const { hashPassword } = require('../utils/password');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { defaultAdminEmail } = require('../config/env');

const router = express.Router();

router.use(requireAuth);

router.get('/recipients', async (req, res) => {
  try {
    const admins = await all('SELECT id, email FROM admin_users ORDER BY email ASC');
    return res.json(admins || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Admin listesi alınamadı' });
  }
});

router.get('/', requireSuperAdmin, async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  try {
    const admins = await all(
      `SELECT 
         id,
         email,
         role,
         (role = 'super_admin') AS is_super_admin,
         is_active,
         created_at,
         updated_at
       FROM admin_users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json(admins);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Admin listesi alınamadı' });
  }
});

router.post('/', requireSuperAdmin, validateAdminCreate, async (req, res) => {
  const { email, password } = req.body;
  const now = new Date().toISOString();

  try {
    const passwordHash = await hashPassword(password);
    const result = await get(
      `INSERT INTO admin_users (email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [email, passwordHash, 'admin', true, now, now]
    );

    try {
      await run(
        `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.admin.id, 'CREATE_ADMIN', 'admin', result.id, null, now]
      );
    } catch (logErr) {
      console.warn('Activity log failed for CREATE_ADMIN:', {
        message: logErr?.message,
        code: logErr?.code,
        detail: logErr?.detail,
      });
      // Do not fail the request because logging failed
    }

    return res.status(201).json({
      id: result.id,
      email,
      role: 'admin',
      is_super_admin: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Admin eklenemedi' });
  }
});

router.delete('/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = Number(id);

  if (Number.isNaN(adminId)) {
    return res.status(400).json({ error: 'Geçersiz admin ID' });
  }

  try {
    const existing = await get(
      'SELECT id, email, role FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Admin bulunamadı' });
    }

    if (existing.id === req.admin.id) {
      return res
        .status(400)
        .json({ error: 'Kendi hesabınızı bu ekrandan silemezsiniz' });
    }

    if (existing.role === 'super_admin') {
      const { count } = await get(
        'SELECT COUNT(*)::int AS count FROM admin_users WHERE role = $1 AND id != $2',
        ['super_admin', adminId]
      );
      if (!count || count < 1) {
        return res
          .status(400)
          .json({ error: 'Sistemde en az bir süper admin kalmalıdır' });
      }
      // default admin da olsa, başka süper admin varsa silmeye izin ver
    }

    await run('DELETE FROM admin_users WHERE id = $1', [adminId]);

    const now = new Date().toISOString();
    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.admin.id, 'DELETE_ADMIN', 'admin', adminId, null, now]
    );

    return res.status(204).send();
  } catch (err) {
    if (err && err.code === '23503') {
      return res.status(400).json({
        error:
          'Bu admin diğer kayıtlarla ilişkili olduğu için silinemiyor.',
      });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Admin silinemedi' });
  }
});

module.exports = router;
