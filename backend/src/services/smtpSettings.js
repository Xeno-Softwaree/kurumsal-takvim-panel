const { smtp: envSmtp } = require('../config/env');
const { getSetting, setSetting } = require('../db/settings');

const SMTP_SETTINGS_KEY = 'smtp';

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function getSmtpSettings() {
  // Always use environment variables - no database fallback
  // SMTP_FORCE_ENV removed to eliminate local data sources
  return {
    host: envSmtp.host,
    port: envSmtp.port,
    secure: !!envSmtp.secure,
    user: envSmtp.user,
    pass: envSmtp.pass,
    fromEmail: envSmtp.fromEmail,
    fromName: envSmtp.fromName,
    source: 'env',
  };
}

async function updateSmtpSettings(next) {
  // SMTP settings are now ENV ONLY - no database storage
  // Return current environment settings
  return getSmtpSettings();
}

module.exports = {
  getSmtpSettings,
  updateSmtpSettings,
};
