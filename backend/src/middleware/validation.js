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

// Standard Turkish national ID (TC Kimlik No) algorithm
function validateTcNo(tc) {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === '0') return false;
  const d = tc.split('').map(Number);
  let d10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  if (d10 < 0) d10 += 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

function validateDepartment(req, res, next) {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Birim adı zorunludur' });
  }
  req.body.name = sanitizeString(name);
  return next();
}

function validateStaff(req, res, next) {
  const { first_name, last_name, tc_no, email, phone, department_id, directorate_id, is_volunteer, status } = req.body || {};

  if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
    return res.status(400).json({ error: 'Ad zorunludur' });
  }
  if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
    return res.status(400).json({ error: 'Soyad zorunludur' });
  }

  const tcRaw = tc_no !== undefined && tc_no !== null ? String(tc_no).trim() : '';
  if (tcRaw && !validateTcNo(tcRaw)) {
    return res.status(400).json({ error: 'Geçersiz TC kimlik numarası' });
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Geçerli bir e-posta girin' });
  }

  const isVol = is_volunteer === true || is_volunteer === 'true';
  const deptId = department_id ? parseInt(department_id, 10) : null;

  if (isVol && deptId) {
    return res.status(400).json({ error: 'Gönüllü personel bir birime bağlanamaz' });
  }
  if (!isVol && !deptId) {
    return res.status(400).json({ error: 'Birimi olmayan personel gönüllü olarak işaretlenmelidir' });
  }

  const cleanStatus = status || 'active';
  if (!['active', 'inactive'].includes(cleanStatus)) {
    return res.status(400).json({ error: 'Geçersiz durum değeri' });
  }

  const dirId = directorate_id ? parseInt(directorate_id, 10) : null;
  if (directorate_id !== undefined && directorate_id !== null && directorate_id !== '' && !dirId) {
    return res.status(400).json({ error: 'Geçersiz müdürlük ID değeri' });
  }

  req.body.first_name = sanitizeString(first_name);
  req.body.last_name = sanitizeString(last_name);
  req.body.tc_no = tcRaw || null;
  req.body.email = email ? sanitizeString(email.toLowerCase()) : null;
  req.body.phone = phone ? sanitizeString(phone) : null;
  req.body.is_volunteer = isVol;
  req.body.department_id = deptId;
  req.body.directorate_id = dirId;
  req.body.status = cleanStatus;

  return next();
}

module.exports = {
  sanitizeString,
  validateLogin,
  validateAdminCreate,
  validateEvent,
  validateDepartment,
  validateStaff,
};
