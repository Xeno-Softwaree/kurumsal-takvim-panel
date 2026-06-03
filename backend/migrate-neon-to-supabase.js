/**
 * Neon → Supabase Veri Taşıma Script'i
 * 
 * Kullanım:
 *   node migrate-neon-to-supabase.js
 * 
 * Bu script Neon'daki tüm verileri Supabase'e aktarır.
 * Tablo oluşturma işlemi zaten backend tarafından yapılıyor,
 * bu yüzden sadece veri kopyalama yapılır.
 */

const { Pool } = require('pg');

// ============================================
// 🔧 BURAYA BAĞLANTI BİLGİLERİNİ GİR
// ============================================
const NEON_URL = 'postgresql://neondb_owner:***REMOVED***@ep-quiet-wildflower-aiamb2m1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';  // ESKİ - Neon
const SUPABASE_URL = 'postgresql://postgres:***REMOVED***@db.obgxtzozxigtcvhecwdk.supabase.co:5432/postgres';  // YENİ - Supabase

// ============================================

const neonPool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const supabasePool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// Tablolar sıralı olmalı (foreign key bağımlılıkları)
const TABLES = [
  'admin_users',
  'events',
  'activity_logs',
  'reminder_deliveries',
  'settings',
  'notifications',
  'documents',
];

async function getRowCount(pool, table) {
  try {
    const res = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    return parseInt(res.rows[0].cnt, 10);
  } catch {
    return -1; // tablo yok
  }
}

async function getRows(pool, table) {
  const res = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
  return res.rows;
}

async function insertRows(pool, table, rows) {
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  let inserted = 0;

  for (const row of rows) {
    const values = columns.map((col) => row[col]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const colList = columns.map((c) => `"${c}"`).join(', ');

    try {
      await pool.query(
        `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted++;
    } catch (err) {
      console.error(`  ⚠️  Satır hatası (${table}, id=${row.id || '?'}): ${err.message}`);
    }
  }

  return inserted;
}

async function resetSequence(pool, table) {
  try {
    await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
  } catch {
    // sequence yoksa veya hata olursa geç
  }
}

async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🚀 Neon → Supabase Veri Taşıma Aracı     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. Bağlantı testi
  console.log('📡 Bağlantılar test ediliyor...');
  
  try {
    const neonTest = await neonPool.query('SELECT NOW()');
    console.log(`  ✅ Neon bağlantısı OK (${neonTest.rows[0].now})`);
  } catch (err) {
    console.error(`  ❌ Neon bağlantı hatası: ${err.message}`);
    console.error('  → NEON_URL değişkenini kontrol et!');
    process.exit(1);
  }

  try {
    const sbTest = await supabasePool.query('SELECT NOW()');
    console.log(`  ✅ Supabase bağlantısı OK (${sbTest.rows[0].now})`);
  } catch (err) {
    console.error(`  ❌ Supabase bağlantı hatası: ${err.message}`);
    console.error('  → SUPABASE_URL değişkenini kontrol et!');
    process.exit(1);
  }

  console.log('');

  // 2. Supabase'de tabloları oluştur (CREATE IF NOT EXISTS)
  console.log('🔨 Supabase tabloları hazırlanıyor...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
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
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admin_users(id),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      meta JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reminder_deliveries (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      stage VARCHAR(50) NOT NULL,
      delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, stage)
    );
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admin_users(id),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      payload JSONB,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES admin_users(id),
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await supabasePool.query(createTableSQL);
    console.log('  ✅ Tablolar hazır');
  } catch (err) {
    console.error(`  ❌ Tablo oluşturma hatası: ${err.message}`);
    process.exit(1);
  }

  console.log('');

  // 3. Neon'dan oku, Supabase'e yaz
  console.log('📊 Neon veritabanı durumu:');
  
  const tableCounts = {};
  for (const table of TABLES) {
    const count = await getRowCount(neonPool, table);
    tableCounts[table] = count;
    const status = count === -1 ? '(tablo yok)' : `${count} kayıt`;
    console.log(`  📋 ${table}: ${status}`);
  }

  console.log('');
  console.log('🔄 Veri taşıma başlıyor...');
  console.log('');

  let totalMigrated = 0;

  for (const table of TABLES) {
    if (tableCounts[table] <= 0) {
      console.log(`  ⏭️  ${table}: Boş, atlanıyor`);
      continue;
    }

    process.stdout.write(`  🔄 ${table}: ${tableCounts[table]} kayıt taşınıyor... `);

    try {
      const rows = await getRows(neonPool, table);
      const inserted = await insertRows(supabasePool, table, rows);

      // Sequence'ları sıfırla (ID'ler doğru devam etsin)
      await resetSequence(supabasePool, table);

      console.log(`✅ ${inserted}/${rows.length} aktarıldı`);
      totalMigrated += inserted;
    } catch (err) {
      console.log(`❌ Hata: ${err.message}`);
    }
  }

  console.log('');

  // 4. Doğrulama
  console.log('🔍 Doğrulama yapılıyor...');
  let allGood = true;

  for (const table of TABLES) {
    if (tableCounts[table] <= 0) continue;

    const neonCount = tableCounts[table];
    const sbCount = await getRowCount(supabasePool, table);

    const match = sbCount >= neonCount ? '✅' : '⚠️';
    if (sbCount < neonCount) allGood = false;

    console.log(`  ${match} ${table}: Neon=${neonCount} → Supabase=${sbCount}`);
  }

  console.log('');
  console.log('══════════════════════════════════════════════');

  if (allGood) {
    console.log('🎉 Tüm veriler başarıyla taşındı!');
    console.log('');
    console.log('Sonraki adımlar:');
    console.log('  1. Render dashboard → DATABASE_URL Supabase olarak ayarla');
    console.log('  2. Deploy et ve uygulamayı test et');
    console.log('  3. Her şey çalışıyorsa Neon projesini silebilirsin');
  } else {
    console.log('⚠️  Bazı tablolarda eksik kayıt var, yukarıdaki logları kontrol et');
  }

  console.log('══════════════════════════════════════════════');
  console.log('');

  await neonPool.end();
  await supabasePool.end();
}

migrate().catch((err) => {
  console.error('💥 Beklenmeyen hata:', err);
  process.exit(1);
});
