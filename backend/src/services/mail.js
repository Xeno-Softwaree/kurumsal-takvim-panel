const { sendMail: sendRawMail } = require('./mailer');

function buildHtmlTemplate(subject, contentHtml) {
  return `
  <!DOCTYPE html>
  <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background:#0f172a;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#020617;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">
              <tr>
                <td style="padding:24px 32px;border-bottom:1px solid #1f2937;">
                  <h1 style="margin:0;font-size:20px;color:#e5e7eb;">Tuzla Belediyesi Afet İşleri ve Risk Yönetimi</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Akıllı etkinlik ve hatırlatma sistemi</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 32px;">
                  ${contentHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px;border-top:1px solid #1f2937;">
                  <p style="margin:0;font-size:11px;color:#6b7280;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

async function sendHtmlMail(to, subject, htmlContent) {
  if (!to || !to.length) return;

  await sendRawMail({
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html: buildHtmlTemplate(subject, htmlContent),
  });
}

function formatEventDetails(event) {
  const dateStr = event.date
    ? new Date(event.date).toLocaleString('tr-TR')
    : '-';
  const pcRaw =
    typeof event.participantCount !== 'undefined'
      ? event.participantCount
      : event.participant_count;
  const pc = Number.isFinite(Number(pcRaw)) ? Number(pcRaw) : 0;

  return `
    <h2 style="margin:0 0 12px;font-size:18px;color:#f9fafb;">${event.title}</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">${event.description || 'Açıklama belirtilmemiş.'}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;"><strong>Tür:</strong> ${
      event.type || 'Belirtilmemiş'
    }</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;"><strong>Tarih:</strong> ${dateStr}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;"><strong>Katılımcı Sayısı:</strong> ${pc}</p>
    <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Tuzla Belediyesi Afet İşleri ve Risk Yönetimi Etkinlik Takip Sistemi üzerinden detayları görüntüleyip güncelleyebilirsiniz.</p>
  `;
}

async function sendEventCreatedMail(recipients, event) {
  const subject = 'Yeni etkinlik oluşturuldu';
  const html = `
    <p style="margin:0 0 12px;font-size:14px;color:#e5e7eb;">Takvime yeni bir etkinlik eklendi.</p>
    ${formatEventDetails(event)}
  `;
  await sendHtmlMail(recipients, subject, html);
}

async function sendEventReminderMail(recipients, event) {
  const subject = 'Etkinlik hatırlatıcısı - 24 saat kaldı';
  const html = `
    <p style="margin:0 0 12px;font-size:14px;color:#e5e7eb;">Aşağıdaki etkinliğe 24 saatten az kaldı.</p>
    ${formatEventDetails(event)}
  `;
  await sendHtmlMail(recipients, subject, html);
}

async function sendDailySummaryMail(recipient, summaryDateLabel, events) {
  const subject = `Günlük Etkinlik Özeti - ${summaryDateLabel}`;

  const itemsHtml = (events || [])
    .map((ev) => {
      const dateStr = ev.date
        ? new Date(ev.date).toLocaleString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '-';

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1f2937;">
            <div style="font-size:14px;color:#f9fafb;font-weight:600;">${ev.title}</div>
            <div style="margin-top:2px;font-size:12px;color:#9ca3af;">${dateStr} • ${
              ev.type || 'Etkinlik'
            }</div>
            ${
              ev.description
                ? `<div style="margin-top:6px;font-size:12px;color:#e5e7eb;">${ev.description}</div>`
                : ''
            }
          </td>
        </tr>
      `;
    })
    .join('');

  const html = events?.length
    ? `
      <p style="margin:0 0 12px;font-size:14px;color:#e5e7eb;">Bugün için planlanan etkinlikler:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${itemsHtml}
      </table>
    `
    : `
      <p style="margin:0;font-size:14px;color:#e5e7eb;">Bugün için kayıtlı etkinlik bulunmuyor.</p>
    `;

  await sendHtmlMail(recipient, subject, html);
}

module.exports = {
  sendEventCreatedMail,
  sendEventReminderMail,
  sendDailySummaryMail,
};

