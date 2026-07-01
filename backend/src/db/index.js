const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('🔴 CRITICAL ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Enforce Supabase-only mode - disable any local database creation
process.env.DUAL_SERVER_MODE = process.env.DUAL_SERVER_MODE || 'disabled';

const databaseUrl = process.env.DATABASE_URL;
try {
  // Validate that the URL is syntactically correct; expects URL-encoded credentials
  // eslint-disable-next-line no-new
  new URL(databaseUrl);
} catch (e) {
  console.error('🔴 ERR_INVALID_URL: DATABASE_URL is not a valid URL');
  console.error('Use URL-encoded credentials in DATABASE_URL (e.g., "/" → %2F, "%" → %25)');
  process.exit(1);
}
console.log('🔗 Connecting to Supabase PostgreSQL...');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }, // Supabase always requires SSL
  family: 4,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  max: 5,
  idleTimeoutMillis: 10000,  // Release idle clients quickly before Supabase drops them
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: false,
});

/**
 * Execute a query with parameters (for INSERT/UPDATE/DELETE)
 */
async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return a single row
 */
async function get(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return all rows
 */
async function all(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Initialize database tables for Supabase PostgreSQL
 */
async function initDatabase() {
  try {
    console.log('🔄 Initializing Supabase PostgreSQL database...');

    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');

    // Create admin_users table
    await run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ admin_users table ready');

    // Create events table with all required columns
    await run(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        label VARCHAR(100),
        participant_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        type VARCHAR(100),
        department VARCHAR(255),
        status VARCHAR(50) DEFAULT 'upcoming',
        reminder_sent BOOLEAN DEFAULT false,
        created_by_admin_id INTEGER REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ events table ready');

    await run(`ALTER TABLE events ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0`);
    await run(`UPDATE events SET participant_count = COALESCE(participant_count, 0) WHERE participant_count IS NULL`);

    // Create activity_logs table
    await run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ activity_logs table ready');

    // Create reminder_deliveries table
    await run(`
      CREATE TABLE IF NOT EXISTS reminder_deliveries (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id),
        stage VARCHAR(50) NOT NULL,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, stage)
      )
    `);
    console.log('✅ reminder_deliveries table ready');

    // Create documents table
    await run(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id),
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ documents table ready');

    // Create settings table for Supabase PostgreSQL
    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ settings table ready');

    // Create notifications table for Supabase PostgreSQL
    await run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        payload JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ notifications table ready');

    // Create departments table
    await run(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ departments table ready');

    // Create staff table
    await run(`
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
      )
    `);
    console.log('✅ staff table ready');

    // Create indexes for performance
    await run(`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_created_by_admin_id ON events(created_by_admin_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_date_active ON events(date, is_active)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_meta_gin ON activity_logs USING GIN (meta)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_event_id ON reminder_deliveries(event_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin ON notifications USING GIN (payload)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_label ON events(label)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_events_dept ON events(department)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_staff_is_volunteer ON staff(is_volunteer)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name)`);
    console.log('✅ Database indexes ready');

    console.log('✅ Supabase PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database test successful:', {
      current_time: result.rows[0].current_time,
      postgres_version: result.rows[0].postgres_version.split(' ')[0],
    });
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  run,
  get,
  all,
  initDatabase,
  testConnection,
};
