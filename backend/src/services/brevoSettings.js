const { getSetting, setSetting } = require('../db/settings');

const BREVO_API_KEY_SETTING = 'brevo_api_key';

async function getBrevoApiKey() {
  const fromDb = await getSetting(BREVO_API_KEY_SETTING);
  const fromEnv = process.env.BREVO_API_KEY;
  const key = (fromEnv && String(fromEnv).trim()) || (fromDb && String(fromDb).trim()) || '';
  return key;
}

async function setBrevoApiKey(apiKey) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) return;
  await setSetting(BREVO_API_KEY_SETTING, key);
}

module.exports = {
  getBrevoApiKey,
  setBrevoApiKey,
  BREVO_API_KEY_SETTING,
};
