const { verifyToken } = require('../utils/jwt');

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

function requireSuperAdmin(req, res, next) {
  if (!req.admin || !req.admin.is_super_admin) {
    return res.status(403).json({ error: 'Super admin privileges required' });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireSuperAdmin,
};

