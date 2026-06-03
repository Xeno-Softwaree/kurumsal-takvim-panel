const express = require('express');
const { get, run } = require('../db');
const { signToken, verifyToken } = require('../utils/jwt');
const { comparePassword } = require('../utils/password');
const { validateLogin } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login endpoint - ONLY uses Supabase PostgreSQL
 */
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Find admin user in PostgreSQL admin_users table
    const admin = await get('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
    
    if (!admin) {
      console.log(`❌ Login failed: Admin not found for email: ${email}`);
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    // Step 2: Verify password using bcrypt
    const passwordValid = await comparePassword(password, admin.password_hash);
    
    if (!passwordValid) {
      console.log(`❌ Login failed: Invalid password for email: ${email}`);
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    // Step 3: Generate JWT token
    const token = signToken({
      adminId: admin.id,
      email: admin.email,
      is_super_admin: admin.role === 'super_admin',
    });

    // Step 4: Log the activity
    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin.id, 'LOGIN', 'admin', admin.id, null, new Date().toISOString()]
    );

    console.log(`✅ Login successful: ${admin.email} (${admin.role})`);

    // Step 5: Return success response
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
    console.error('❌ Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      routine: error.routine,
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ 
      error: 'Giriş sırasında hata oluştu',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/me
 * Get current admin info from token
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const admin = await get(
      'SELECT id, email, role, created_at FROM admin_users WHERE id = $1 AND is_active = true',
      [req.admin.id]
    );

    if (!admin) {
      return res.status(404).json({ error: 'Admin bulunamadı' });
    }

    return res.json({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      is_super_admin: admin.role === 'super_admin',
    });

  } catch (error) {
    console.error('Get admin error:', error);
    return res.status(500).json({ error: 'Admin bilgileri alınamadı' });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (just for logging)
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await run(
      `INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.admin.id, 'LOGOUT', 'admin', req.admin.id, null, new Date().toISOString()]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Çıkış yapılamadı' });
  }
});

// Helper function for auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = verifyToken(token);
    
    req.admin = {
      id: payload.adminId,
      email: payload.email,
      is_super_admin: !!payload.is_super_admin,
    };
    
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { router, requireAuth };