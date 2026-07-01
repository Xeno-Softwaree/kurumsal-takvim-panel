-- Migration: Stok / Ekipman yönetimi
-- Date: 2026-07-01

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  has_variant BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_variants (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
  variant_label VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, variant_label)
);

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER REFERENCES inventory_variants(id),
  staff_id INTEGER REFERENCES staff(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','returned')),
  assigned_by_admin_id INTEGER REFERENCES admin_users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  returned_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_assignments_variant_id ON inventory_assignments(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_staff_id ON inventory_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_assignments_status ON inventory_assignments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_variants_item_id ON inventory_variants(item_id);
