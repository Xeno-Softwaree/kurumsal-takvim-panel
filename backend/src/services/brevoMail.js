const axios = require('axios');

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

function normalizeRecipients(to) {
  if (!to) return [];
  if (Array.isArray(to)) return to;
  if (typeof to === 'string') {
    return to
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

async function sendBrevoMail({ apiKey, to, subject, text, html }) {
  if (!apiKey) {
    const err = new Error('Brevo API key missing');
    err.code = 'BREVO_KEY_MISSING';
    throw err;
  }

  const recipients = normalizeRecipients(to);
  if (recipients.length === 0) return { skipped: true };

  const payload = {
    sender: {
      email: 'xenooo98@gmail.com',
      name: 'Takvim Takip',
    },
    to: recipients.map((email) => ({ email })),
    subject: subject || '(no subject)',
    textContent: text || undefined,
    htmlContent: html || undefined,
  };

  try {
    const res = await axios.post(BREVO_SEND_URL, payload, {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      timeout: 15_000,
    });

    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = `Brevo API request failed${status ? ` (HTTP ${status})` : ''}`;
      const e = new Error(msg);
      e.code = status || err.code || 'BREVO_API_ERROR';
      e.detail = data || err.message;
      throw e;
    }
    throw err;
  }
}

module.exports = {
  sendBrevoMail,
  BREVO_SEND_URL,
};
