const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { sendMail } = require('../services/mailer');
const { defaultAdminEmail } = require('../config/env');

const router = express.Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

const testMailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/test', testMailLimiter, async (req, res) => {
  const { to } = req.body || {};
  const target = (typeof to === 'string' && to.trim()) || defaultAdminEmail;

  try {
    await sendMail({
      to: target,
      subject: 'Kurumsal Takvim - Brevo API Test',
      text: `Brevo API test maili. Gönderen: ${req.admin.email}`,
    });
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Mail test failed:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      detail: err?.detail,
    });
    return res.status(500).json({
      error: 'Test maili gönderilemedi',
      detail:
        err && err.detail
          ? err.detail
          : err && err.message
            ? err.message
            : String(err),
      code: err?.code || null,
    });
  }
});

module.exports = router;
