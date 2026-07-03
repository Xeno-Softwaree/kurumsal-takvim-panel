const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { validateDepartment } = require('../middleware/validation');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT id, name, created_at FROM directorates ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Müdürlükler alınamadı' });
  }
});

router.post('/', requireSuperAdmin, validateDepartment, async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await get('SELECT id FROM directorates WHERE name = $1', [name]);
    if (existing) return res.status(409).json({ error: 'Bu isimde bir müdürlük zaten mevcut' });

    const row = await get('INSERT INTO directorates (name) VALUES ($1) RETURNING *', [name]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'CREATE_DIRECTORATE', 'directorate', row.id, JSON.stringify({ name })],
    );

    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Müdürlük oluşturulamadı' });
  }
});

router.put('/:id', requireSuperAdmin, validateDepartment, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const dir = await get('SELECT id FROM directorates WHERE id = $1', [id]);
    if (!dir) return res.status(404).json({ error: 'Müdürlük bulunamadı' });

    const conflict = await get('SELECT id FROM directorates WHERE name = $1 AND id != $2', [name, id]);
    if (conflict) return res.status(409).json({ error: 'Bu isimde bir müdürlük zaten mevcut' });

    const row = await get('UPDATE directorates SET name = $1 WHERE id = $2 RETURNING *', [name, id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'UPDATE_DIRECTORATE', 'directorate', row.id, JSON.stringify({ name })],
    );

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Müdürlük güncellenemedi' });
  }
});

router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const dir = await get('SELECT id, name FROM directorates WHERE id = $1', [id]);
    if (!dir) return res.status(404).json({ error: 'Müdürlük bulunamadı' });

    const staffCount = await get('SELECT COUNT(*)::int AS count FROM staff WHERE directorate_id = $1', [id]);
    if (staffCount.count > 0) {
      return res.status(400).json({ error: 'Bu müdürlüğe bağlı personel var, silinemez' });
    }

    await run('DELETE FROM directorates WHERE id = $1', [id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'DELETE_DIRECTORATE', 'directorate', parseInt(id, 10), JSON.stringify({ name: dir.name })],
    );

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Müdürlük silinemedi' });
  }
});

module.exports = router;
