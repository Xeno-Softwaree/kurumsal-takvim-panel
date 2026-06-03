const SibApiV3Sdk = require('sib-api-v3-sdk');

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

async function sendMail({ to, subject, text, html }) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'Tuzla Belediyesi Afet İşleri ve Risk Yönetimi').trim();

  if (!apiKey) {
    const err = new Error('Brevo API key missing');
    err.code = 'BREVO_KEY_MISSING';
    throw err;
  }
  if (!senderEmail) {
    const err = new Error('Brevo sender email missing');
    err.code = 'BREVO_SENDER_MISSING';
    throw err;
  }

  const recipients = normalizeRecipients(to);
  if (recipients.length === 0) return { skipped: true };

  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications['api-key'].apiKey = apiKey;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject || '(no subject)';
  sendSmtpEmail.sender = { email: senderEmail, name: senderName || undefined };
  sendSmtpEmail.to = recipients.map((email) => ({ email }));
  if (typeof html === 'string' && html.trim()) {
    sendSmtpEmail.htmlContent = html;
  }
  if (typeof text === 'string' && text.trim()) {
    sendSmtpEmail.textContent = text;
  }

  return apiInstance.sendTransacEmail(sendSmtpEmail);
}

module.exports = {
  sendMail,
};
