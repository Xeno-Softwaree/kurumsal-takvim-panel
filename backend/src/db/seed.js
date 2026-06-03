const bcrypt = require('bcrypt');
const { run } = require('../db');
const { defaultAdminEmail, defaultAdminPassword } = require('../config/env');

async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await run(
      'SELECT id FROM admin_users WHERE email = $1',
      [defaultAdminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('👤 Default admin already exists:', defaultAdminEmail);
      return;
    }

    // Create default admin
    const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
    
    await run(
      `INSERT INTO admin_users (email, password_hash, role, is_active) 
       VALUES ($1, $2, $3, $4)`,
      [defaultAdminEmail, passwordHash, 'super_admin', true]
    );

    console.log('✅ Default admin created successfully:');
    console.log(`   Email: ${defaultAdminEmail}`);
    console.log(`   Password: ${defaultAdminPassword}`);
  } catch (error) {
    console.error('❌ Failed to create default admin:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createDefaultAdmin().then(() => process.exit(0));
}

module.exports = { createDefaultAdmin };