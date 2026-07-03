const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { validateStaff } = require('../middleware/validation');

const router = express.Router();
router.use(requireAuth);

function maskTcNo(tc) {
  if (!tc) return null;
  return `${tc.slice(0, 3)}*****${tc.slice(8)}`;
}

// GET /api/staff — tc_no always masked for everyone
router.get('/', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        s.id, s.first_name, s.last_name,
        CASE
          WHEN s.tc_no IS NOT NULL
            THEN substring(s.tc_no FROM 1 FOR 3) || '*****' || substring(s.tc_no FROM 9)
          ELSE NULL
        END AS tc_no,
        s.birth_date, s.email, s.phone,
        s.department_id, d.name AS department_name,
        s.directorate_id, dir.name AS directorate_name,
        s.is_volunteer, s.status, s.created_at, s.updated_at
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN directorates dir ON s.directorate_id = dir.id
      ORDER BY s.last_name ASC, s.first_name ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Personel listesi alınamadı' });
  }
});

// GET /api/staff/:id — super admin sees full tc_no, others see masked; includes active assignments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await get(`
      SELECT
        s.id, s.first_name, s.last_name, s.tc_no,
        s.birth_date, s.email, s.phone,
        s.department_id, d.name AS department_name,
        s.directorate_id, dir.name AS directorate_name,
        s.is_volunteer, s.status, s.created_by_admin_id, s.created_at, s.updated_at
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN directorates dir ON s.directorate_id = dir.id
      WHERE s.id = $1
    `, [id]);

    if (!row) return res.status(404).json({ error: 'Personel bulunamadı' });

    if (!req.admin.is_super_admin && row.tc_no) {
      row.tc_no = maskTcNo(row.tc_no);
    }

    // Active (non-returned) assignments for this staff member
    const activeAssignments = await all(`
      SELECT
        ia.id, ia.quantity, ia.status, ia.assigned_at, ia.notes,
        iv.id AS variant_id, iv.variant_label,
        ii.id AS item_id, ii.name AS item_name, ii.category
      FROM inventory_assignments ia
      JOIN inventory_variants iv ON ia.variant_id = iv.id
      JOIN inventory_items ii ON iv.item_id = ii.id
      WHERE ia.staff_id = $1 AND ia.status = 'assigned'
      ORDER BY ia.assigned_at DESC
    `, [id]);

    return res.json({ ...row, active_assignments: activeAssignments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Personel bilgisi alınamadı' });
  }
});

// POST /api/staff
router.post('/', requireSuperAdmin, validateStaff, async (req, res) => {
  try {
    const { first_name, last_name, tc_no, birth_date, email, phone, department_id, directorate_id, is_volunteer, status } = req.body;

    if (tc_no) {
      const tcConflict = await get('SELECT id FROM staff WHERE tc_no = $1', [tc_no]);
      if (tcConflict) return res.status(409).json({ error: 'Bu TC kimlik numarası zaten kayıtlı' });
    }

    const row = await get(`
      INSERT INTO staff
        (first_name, last_name, tc_no, birth_date, email, phone, department_id, directorate_id, is_volunteer, status, created_by_admin_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [first_name, last_name, tc_no || null, birth_date || null, email || null, phone || null, department_id, directorate_id || null, is_volunteer, status, req.admin.id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'CREATE_STAFF', 'staff', row.id, JSON.stringify({ name: `${first_name} ${last_name}` })],
    );

    return res.status(201).json({ ...row, tc_no: row.tc_no ? maskTcNo(row.tc_no) : null });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu TC kimlik numarası zaten kayıtlı' });
    if (err.code === '23514') return res.status(400).json({ error: 'Gönüllü personel bir birime bağlanamaz' });
    console.error(err);
    return res.status(500).json({ error: 'Personel kaydedilemedi' });
  }
});

// PUT /api/staff/:id
router.put('/:id', requireSuperAdmin, validateStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, tc_no, birth_date, email, phone, department_id, directorate_id, is_volunteer, status } = req.body;

    const current = await get('SELECT tc_no FROM staff WHERE id = $1', [id]);
    if (!current) return res.status(404).json({ error: 'Personel bulunamadı' });

    // If TC not provided in edit, keep existing value
    const finalTcNo = tc_no || current.tc_no || null;

    if (finalTcNo && finalTcNo !== current.tc_no) {
      const tcConflict = await get('SELECT id FROM staff WHERE tc_no = $1 AND id != $2', [finalTcNo, id]);
      if (tcConflict) return res.status(409).json({ error: 'Bu TC kimlik numarası zaten kayıtlı' });
    }

    const row = await get(`
      UPDATE staff SET
        first_name = $1, last_name = $2, tc_no = $3, birth_date = $4,
        email = $5, phone = $6, department_id = $7, directorate_id = $8,
        is_volunteer = $9, status = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [first_name, last_name, finalTcNo, birth_date || null, email || null, phone || null, department_id, directorate_id || null, is_volunteer, status, id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'UPDATE_STAFF', 'staff', row.id, JSON.stringify({ name: `${first_name} ${last_name}` })],
    );

    return res.json({ ...row, tc_no: row.tc_no ? maskTcNo(row.tc_no) : null });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu TC kimlik numarası zaten kayıtlı' });
    if (err.code === '23514') return res.status(400).json({ error: 'Gönüllü personel bir birime bağlanamaz' });
    console.error(err);
    return res.status(500).json({ error: 'Personel güncellenemedi' });
  }
});

// DELETE /api/staff/:id
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const person = await get('SELECT id, first_name, last_name FROM staff WHERE id = $1', [id]);
    if (!person) return res.status(404).json({ error: 'Personel bulunamadı' });

    await run('DELETE FROM staff WHERE id = $1', [id]);

    await run(
      'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
      [req.admin.id, 'DELETE_STAFF', 'staff', parseInt(id, 10), JSON.stringify({ name: `${person.first_name} ${person.last_name}` })],
    );

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Personel silinemedi' });
  }
});

module.exports = router;
