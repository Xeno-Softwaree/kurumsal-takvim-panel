const express = require('express');
const { all, get, run, runTransaction } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { sanitizeString } = require('../middleware/validation');

const router = express.Router();
router.use(requireAuth);

function statusError(code, msg) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

// ── ITEMS ──────────────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const rows = await all(`
      SELECT
        i.id, i.name, i.category, i.has_variant, i.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'variant_label', v.variant_label,
              'quantity', v.quantity
            ) ORDER BY v.variant_label NULLS LAST
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'::json
        ) AS variants
      FROM inventory_items i
      LEFT JOIN inventory_variants v ON v.item_id = i.id
      GROUP BY i.id, i.name, i.category, i.has_variant, i.created_at
      ORDER BY i.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Stok listesi alınamadı' });
  }
});

router.post('/items', requireSuperAdmin, async (req, res) => {
  const { name, category, has_variant, variants } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Ürün adı zorunludur' });

  try {
    const item = await get(
      'INSERT INTO inventory_items (name, category, has_variant) VALUES ($1, $2, $3) RETURNING *',
      [sanitizeString(String(name)), category ? sanitizeString(String(category)) : null, !!has_variant],
    );

    const createdVariants = [];
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (!v || typeof v !== 'object') continue;
        const qty = Math.max(0, parseInt(v.quantity, 10) || 0);
        const label = v.label ? sanitizeString(String(v.label)) : null;
        const vRow = await get(
          'INSERT INTO inventory_variants (item_id, variant_label, quantity) VALUES ($1, $2, $3) RETURNING *',
          [item.id, label, qty],
        );
        if (vRow) createdVariants.push(vRow);
      }
    }

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'CREATE_INVENTORY_ITEM', 'inventory_item', item.id, JSON.stringify({ name: item.name })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.status(201).json({ ...item, variants: createdVariants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ürün oluşturulamadı' });
  }
});

router.put('/items/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, category } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Ürün adı zorunludur' });

  try {
    const row = await get(
      'UPDATE inventory_items SET name = $1, category = $2 WHERE id = $3 RETURNING *',
      [sanitizeString(String(name)), category ? sanitizeString(String(category)) : null, id],
    );
    if (!row) return res.status(404).json({ error: 'Ürün bulunamadı' });

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'UPDATE_INVENTORY_ITEM', 'inventory_item', row.id, JSON.stringify({ name: row.name })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ürün güncellenemedi' });
  }
});

router.delete('/items/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await get('SELECT id, name FROM inventory_items WHERE id = $1', [id]);
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı' });

    // Block deletion only if there are active (not yet returned) assignments
    const hasActiveAssignments = await get(`
      SELECT 1 FROM inventory_assignments ia
      JOIN inventory_variants v ON ia.variant_id = v.id
      WHERE v.item_id = $1 AND ia.status = 'assigned'
      LIMIT 1
    `, [id]);
    if (hasActiveAssignments) {
      return res.status(400).json({ error: 'Bu ürüne ait aktif zimmet var, önce iade alınmalı' });
    }

    await run('DELETE FROM inventory_items WHERE id = $1', [id]);

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'DELETE_INVENTORY_ITEM', 'inventory_item', parseInt(id, 10), JSON.stringify({ name: item.name })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Ürün silinemedi' });
  }
});

// ── VARIANTS ───────────────────────────────────────────────────────────────

router.post('/items/:id/variants', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { label, quantity } = req.body;
  const qty = Math.max(0, parseInt(quantity, 10) || 0);

  try {
    const item = await get('SELECT id FROM inventory_items WHERE id = $1', [id]);
    if (!item) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const row = await get(
      'INSERT INTO inventory_variants (item_id, variant_label, quantity) VALUES ($1, $2, $3) RETURNING *',
      [id, label ? sanitizeString(String(label)) : null, qty],
    );

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'ADD_INVENTORY_VARIANT', 'inventory_variant', row.id,
          JSON.stringify({ item_id: parseInt(id, 10), label, qty })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.status(201).json(row);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu varyant etiketi zaten mevcut' });
    console.error(err);
    return res.status(500).json({ error: 'Varyant eklenemedi' });
  }
});

// Manual stock adjustment — atomic single UPDATE (no separate read needed)
router.post('/variants/:id/adjust', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { delta, reason } = req.body;
  const d = parseInt(delta, 10);
  if (Number.isNaN(d) || d === 0) return res.status(400).json({ error: 'Geçerli bir miktar girin (sıfır olamaz)' });
  const reasonStr = reason ? String(reason).trim() : null;

  try {
    // quantity + delta >= 0 guard is atomic — no race condition possible
    const updated = await get(
      'UPDATE inventory_variants SET quantity = quantity + $1 WHERE id = $2 AND quantity + $1 >= 0 RETURNING quantity',
      [d, id],
    );
    if (!updated) return res.status(400).json({ error: 'Yetersiz stok — sonuç negatife düşemez' });

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'ADJUST_INVENTORY', 'inventory_variant', parseInt(id, 10),
          JSON.stringify({ delta: d, reason: reasonStr, new_quantity: updated.quantity })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.json({ quantity: updated.quantity });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Stok ayarlanamadı' });
  }
});

router.get('/variants/:id/assignments', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await all(`
      SELECT
        ia.id, ia.quantity, ia.status, ia.assigned_at, ia.returned_at, ia.notes,
        s.id AS staff_id, s.first_name, s.last_name,
        a.email AS assigned_by_email
      FROM inventory_assignments ia
      JOIN staff s ON ia.staff_id = s.id
      LEFT JOIN admin_users a ON ia.assigned_by_admin_id = a.id
      WHERE ia.variant_id = $1
      ORDER BY ia.assigned_at DESC
    `, [id]);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Zimmet listesi alınamadı' });
  }
});

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────

// Atomic: stock deduction + assignment insert in one transaction
router.post('/assignments', requireSuperAdmin, async (req, res) => {
  const { variant_id, staff_id, quantity, notes } = req.body;
  const qty = parseInt(quantity, 10);
  if (!variant_id || !staff_id) return res.status(400).json({ error: 'Varyant ve personel zorunludur' });
  if (!qty || qty < 1) return res.status(400).json({ error: 'Adet en az 1 olmalıdır' });

  try {
    const assignment = await runTransaction(async (client) => {
      // Atomic stock deduction — if quantity < qty the UPDATE matches no rows
      const updated = await client.query(
        'UPDATE inventory_variants SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1 RETURNING id',
        [qty, parseInt(variant_id, 10)],
      );
      if (updated.rows.length === 0) throw statusError(400, 'Yetersiz stok');

      const result = await client.query(
        `INSERT INTO inventory_assignments (variant_id, staff_id, quantity, notes, assigned_by_admin_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [parseInt(variant_id, 10), parseInt(staff_id, 10), qty, notes?.trim() || null, req.admin.id],
      );
      return result.rows[0];
    });

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'ASSIGN_INVENTORY', 'inventory_assignment', assignment.id,
          JSON.stringify({ variant_id: parseInt(variant_id, 10), staff_id: parseInt(staff_id, 10), quantity: qty })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.status(201).json(assignment);
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Zimmet verilemedi' });
  }
});

// Atomic: assignment status check + stock return + assignment update in one transaction
router.put('/assignments/:id/return', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runTransaction(async (client) => {
      // Lock the assignment row to prevent concurrent double-returns
      const locked = await client.query(
        'SELECT * FROM inventory_assignments WHERE id = $1 FOR UPDATE',
        [parseInt(id, 10)],
      );
      if (locked.rows.length === 0) throw statusError(404, 'Zimmet bulunamadı');
      const a = locked.rows[0];
      if (a.status === 'returned') throw statusError(400, 'Bu zimmet zaten iade edilmiş');

      await client.query(
        'UPDATE inventory_variants SET quantity = quantity + $1 WHERE id = $2',
        [a.quantity, a.variant_id],
      );

      const updated = await client.query(
        `UPDATE inventory_assignments SET status = 'returned', returned_at = NOW()
         WHERE id = $1 RETURNING *`,
        [parseInt(id, 10)],
      );
      return updated.rows[0];
    });

    try {
      await run(
        'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'RETURN_INVENTORY', 'inventory_assignment', parseInt(id, 10),
          JSON.stringify({ quantity: result.quantity })],
      );
    } catch (logErr) { console.warn('Activity log failed:', logErr?.message); }

    return res.json(result);
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    if (err.statusCode === 404) return res.status(404).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'İade alınamadı' });
  }
});

module.exports = router;
