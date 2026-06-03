console.log('🔗 Creating temporary simplified auth endpoint...');

// Minimal login endpoint without validation for testing
const { get } = require('./src/db');
const { signToken } = require('./src/utils/jwt');
const bcrypt = require('bcrypt');

exports.router = async function(req, res) {
  const { email, password } = req.body;

  try {
    // Step 1: Find admin in PostgreSQL
    console.log('🔍 Testing login for email:', email);
    const admin = await get('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
    
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    // Step 2: Verify password
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    // Step 3: Generate JWT token
    const token = signToken({
      adminId: admin.id,
      email: admin.email,
      is_super_admin: admin.role === 'super_admin',
    });

    console.log('✅ Token generated successfully for:', email);
    
    // Return success
    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        is_super_admin: admin.role === 'super_admin',
      },
    });

  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    return res.status(500).json({ error: error.message });
  }
};