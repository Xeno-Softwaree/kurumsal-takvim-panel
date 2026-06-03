const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  // Trim and remove basic HTML tags to mitigate XSS
  return value.trim().replace(/<[^>]*>/g, '');
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta girin' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
  }
  req.body.email = sanitizeString(email.toLowerCase());
  return next();
}

function validateAdminCreate(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta girin' });
  }
  if (!password || String(password).length < 8) {
    return res
      .status(400)
      .json({ error: 'Şifre en az 8 karakter olmalı' });
  }
  req.body.email = sanitizeString(email.toLowerCase());
  return next();
}

function validateEvent(req, res, next) {
  const { title, description, type, department, date, status, participantCount } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Başlık zorunludur' });
  }
  if (!date || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Geçerli bir tarih girin' });
  }

  const pcRaw = participantCount;
  let pc = Number(pcRaw);
  if (typeof pcRaw === 'string' && pcRaw.trim() !== '' && Number.isNaN(pc)) {
    const digits = pcRaw.replace(/\D+/g, '');
    pc = Number(digits || '0');
  }
  if (!Number.isFinite(pc) || pc < 0) {
    return res.status(400).json({ error: 'Katılımcı sayısı geçersiz' });
  }
  pc = Math.floor(pc);

  req.body.title = sanitizeString(title);
  req.body.description = sanitizeString(description || '');
  req.body.type = sanitizeString(type || '');
  req.body.department = sanitizeString(department || '');
  req.body.status = sanitizeString(status || 'upcoming');
  req.body.participantCount = pc;

  return next();
}

module.exports = {
  sanitizeString,
  validateLogin,
  validateAdminCreate,
  validateEvent,
};
