-- Migration: Ekip / Personel özelliği
-- Date: 2026-07-01

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  tc_no VARCHAR(11) UNIQUE,
  birth_date DATE,
  email VARCHAR(255),
  phone VARCHAR(20),
  department_id INTEGER REFERENCES departments(id),
  is_volunteer BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_by_admin_id INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (department_id IS NOT NULL AND is_volunteer = false) OR
    (department_id IS NULL AND is_volunteer = true)
  )
);

CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_is_volunteer ON staff(is_volunteer);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
