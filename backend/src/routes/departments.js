const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { validateDepartment } = require('../middleware/validation');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT id, name, created_at FROM departments ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Birimler alınamadı' });
  }
});

router.post('/', requireSuperAdmin, validateDepartment, async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await get('SELECT id FROM departments WHERE name = $1', [name]);
    if (existing) return res.status(409).json({ error: 'Bu isimde bir birim zaten mevcut' });

    const row = await get('INSERT INTO departments (name) VALUES ($1) RETURNING *', [name]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'CREATE_DEPARTMENT', 'department', row.id, JSON.stringify({ name })],
    );

    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Birim oluşturulamadı' });
  }
});

router.put('/:id', requireSuperAdmin, validateDepartment, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const dept = await get('SELECT id FROM departments WHERE id = $1', [id]);
    if (!dept) return res.status(404).json({ error: 'Birim bulunamadı' });

    const conflict = await get('SELECT id FROM departments WHERE name = $1 AND id != $2', [name, id]);
    if (conflict) return res.status(409).json({ error: 'Bu isimde bir birim zaten mevcut' });

    const row = await get('UPDATE departments SET name = $1 WHERE id = $2 RETURNING *', [name, id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'UPDATE_DEPARTMENT', 'department', row.id, JSON.stringify({ name })],
    );

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Birim güncellenemedi' });
  }
});

router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const dept = await get('SELECT id, name FROM departments WHERE id = $1', [id]);
    if (!dept) return res.status(404).json({ error: 'Birim bulunamadı' });

    const staffCount = await get('SELECT COUNT(*)::int AS count FROM staff WHERE department_id = $1', [id]);
    if (staffCount.count > 0) {
      return res.status(400).json({ error: 'Bu birime bağlı personel var. Önce personeli başka birime aktarın.' });
    }

    await run('DELETE FROM departments WHERE id = $1', [id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'DELETE_DEPARTMENT', 'department', parseInt(id, 10), JSON.stringify({ name: dept.name })],
    );

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Birim silinemedi' });
  }
});

module.exports = router;
