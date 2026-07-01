const bcrypt = require('bcrypt');
const { run } = require('../db');
const { defaultAdminEmail, defaultAdminPassword } = require('../config/env');

async function createDefaultAdmin() {
  const existingAdmin = await run(
    'SELECT id FROM admin_users WHERE email = $1',
    [defaultAdminEmail]
  );

  if (existingAdmin.rows.length > 0) {
    console.log('👤 Default admin already exists:', defaultAdminEmail);
    return;
  }

  if (!defaultAdminPassword) {
    console.error('❌ DEFAULT_ADMIN_PASSWORD ortam değişkeni set edilmemiş.');
    console.error('   Veritabanında henüz admin yok; bu env olmadan admin oluşturulamaz.');
    console.error('   Render → Environment → DEFAULT_ADMIN_PASSWORD değerini gir ve yeniden deploy et.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);

  await run(
    `INSERT INTO admin_users (email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4)`,
    [defaultAdminEmail, passwordHash, 'super_admin', true]
  );

  console.log('✅ Default admin created successfully:');
  console.log(`   Email: ${defaultAdminEmail}`);
  console.log('   Password: [DEFAULT_ADMIN_PASSWORD env değişkeninden okundu]');
}

// Run if this file is executed directly
if (require.main === module) {
  createDefaultAdmin().then(() => process.exit(0));
}

module.exports = { createDefaultAdmin };