-- Add directorates table (independent organizational layer)
CREATE TABLE IF NOT EXISTS directorates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add optional directorate_id to staff (independent of department/volunteer constraint)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS directorate_id INTEGER REFERENCES directorates(id);

CREATE INDEX IF NOT EXISTS idx_staff_directorate_id ON staff(directorate_id);
