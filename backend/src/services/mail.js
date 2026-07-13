const { sendMail: sendRawMail } = require('./mailer');
const { frontendOrigin } = require('../config/env');

function buildHtmlTemplate(subject, contentHtml, { badgeText, badgeBg, badgeFg, actionUrl } = {}) {
  const badgeRow = badgeText
    ? `<tr>
        <td style="padding:20px 32px 0;">
          <span style="display:inline-block;padding:4px 14px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.4px;background:${badgeBg || '#d1fae5'};color:${badgeFg || '#065f46'};">${badgeText}</span>
        </td>
      </tr>`
    : '';

  const buttonRow = actionUrl
    ? `<tr>
        <td style="padding:24px 32px 0;text-align:left;">
          <a href="${actionUrl}" style="display:inline-block;padding:11px 26px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Panelde görüntüle →</a>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:22px 32px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb 0%,#06b6d4 100%);border-radius:12px;padding:10px;text-align:center;vertical-align:middle;">
                    <img src="${frontendOrigin}/logo.png" width="32" height="32" alt="" style="display:block;border-radius:5px;"/>
                  </td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div style="font-size:15px;font-weight:700;color:#1e293b;line-height:1.25;margin:0;">Tuzla Belediyesi</div>
                    <div style="font-size:12px;color:#64748b;margin:2px 0 0;">Afet İşleri ve Risk Yönetimi</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${badgeRow}
          <tr><td style="padding:24px 32px;">${contentHtml}</td></tr>
          ${buttonRow}
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendHtmlMail(to, subject, contentHtml, opts = {}) {
  if (!to || (Array.isArray(to) && !to.length)) return;
  await sendRawMail({
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html: buildHtmlTemplate(subject, contentHtml, opts),
  });
}

function infoBox(rows) {
  const rowsHtml = rows
    .map(
      ({ label, valueHtml }) =>
        `<tr>
          <td style="padding:7px 0;font-size:12px;font-weight:600;color:#64748b;white-space:nowrap;width:130px;vertical-align:top;">${label}</td>
          <td style="padding:7px 0 7px 12px;font-size:13px;color:#1e293b;vertical-align:top;">${valueHtml}</td>
        </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-top:16px;"><tr><td style="padding:4px 20px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowsHtml}</table></td></tr></table>`;
}

function eventTitleHtml(title) {
  return `<h2 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#1e293b;line-height:1.3;">${title}</h2>`;
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('tr-TR');
}

function getParticipantCount(event) {
  const raw =
    typeof event.participantCount !== 'undefined'
      ? event.participantCount
      : event.participant_count;
  return Number.isFinite(Number(raw)) ? Number(raw) : 0;
}

async function sendEventCreatedMail(recipients, event) {
  const subject = `Yeni Etkinlik: ${event.title}`;
  const rows = [
    { label: 'Kategori', valueHtml: event.type || 'Belirtilmemiş' },
    { label: 'Tarih', valueHtml: formatDate(event.date) },
    { label: 'Katılımcı Sayısı', valueHtml: String(getParticipantCount(event)) },
  ];
  if (event.department) rows.push({ label: 'Departman', valueHtml: event.department });
  const content = `
    ${eventTitleHtml(event.title)}
    <p style="margin:0 0 4px;font-size:14px;color:#475569;">Takvime yeni bir etkinlik eklendi.</p>
    ${infoBox(rows)}`;
  await sendHtmlMail(recipients, subject, content, {
    badgeText: 'Yeni Etkinlik',
    badgeBg: '#d1fae5',
    badgeFg: '#065f46',
    actionUrl: `${frontendOrigin}/calendar?eventId=${event.id}`,
  });
}

async function sendEventDateChangedMail(recipients, event, oldDate, newDate, changedByEmail) {
  const subject = `Tarih Değişti: ${event.title}`;
  const rows = [
    { label: 'Kategori', valueHtml: event.type || 'Belirtilmemiş' },
    {
      label: 'Eski Tarih',
      valueHtml: `<span style="text-decoration:line-through;color:#94a3b8;">${formatDate(oldDate)}</span>`,
    },
    {
      label: 'Yeni Tarih',
      valueHtml: `<span style="font-weight:700;color:#ea580c;">${formatDate(newDate)}</span>`,
    },
    { label: 'Katılımcı Sayısı', valueHtml: String(getParticipantCount(event)) },
  ];
  if (changedByEmail) rows.push({ label: 'Güncelleyen', valueHtml: changedByEmail });
  const content = `
    ${eventTitleHtml(event.title)}
    <p style="margin:0 0 4px;font-size:14px;color:#475569;">Bir etkinliğin tarihi güncellendi.</p>
    ${infoBox(rows)}`;
  await sendHtmlMail(recipients, subject, content, {
    badgeText: 'Tarih Değişti',
    badgeBg: '#ffedd5',
    badgeFg: '#9a3412',
    actionUrl: `${frontendOrigin}/calendar?eventId=${event.id}`,
  });
}

async function sendEventReminderMail(recipients, event, { stageLabel, isAuto } = {}) {
  const autoReminder = isAuto || Boolean(stageLabel);
  const subject = stageLabel
    ? `Hatırlatıcı: ${event.title} (${stageLabel} kaldı)`
    : `Etkinlik Hatırlatıcısı: ${event.title}`;
  const rows = [
    { label: 'Kategori', valueHtml: event.type || 'Belirtilmemiş' },
    { label: 'Tarih', valueHtml: formatDate(event.date) },
    { label: 'Katılımcı Sayısı', valueHtml: String(getParticipantCount(event)) },
  ];
  if (event.department) rows.push({ label: 'Departman', valueHtml: event.department });
  const content = `
    ${eventTitleHtml(event.title)}
    <p style="margin:0 0 4px;font-size:14px;color:#475569;">${stageLabel ? `Etkinliğe <strong>${stageLabel}</strong> kaldı.` : 'Etkinlik için hatırlatıcı gönderildi.'}</p>
    ${infoBox(rows)}`;
  await sendHtmlMail(recipients, subject, content, {
    badgeText: autoReminder ? 'Otomatik Hatırlatıcı' : 'Manuel Hatırlatıcı',
    badgeBg: autoReminder ? '#ede9fe' : '#dbeafe',
    badgeFg: autoReminder ? '#5b21b6' : '#1e40af',
    actionUrl: `${frontendOrigin}/calendar?eventId=${event.id}`,
  });
}

async function sendDailySummaryMail(recipient, summaryDateLabel, events) {
  const subject = `Günlük Etkinlik Özeti - ${summaryDateLabel}`;
  let content;
  if (!events?.length) {
    content = `<p style="margin:0;font-size:14px;color:#475569;">Bugün için kayıtlı etkinlik bulunmuyor.</p>`;
  } else {
    const itemsHtml = events
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
        return `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${ev.title}</div>
            <div style="margin-top:3px;font-size:12px;color:#64748b;">${dateStr}${ev.type ? ` • ${ev.type}` : ''}</div>
            ${ev.description ? `<div style="margin-top:5px;font-size:12px;color:#475569;">${ev.description}</div>` : ''}
          </td>
        </tr>`;
      })
      .join('');
    content = `
      <p style="margin:0 0 14px;font-size:14px;color:#475569;">Bugün için planlanan etkinlikler:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:0 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemsHtml}</table>
        </td></tr>
      </table>`;
  }
  await sendHtmlMail(recipient, subject, content, {
    badgeText: 'Günlük Özet',
    badgeBg: '#d1fae5',
    badgeFg: '#065f46',
    actionUrl: `${frontendOrigin}/calendar`,
  });
}

module.exports = {
  buildHtmlTemplate,
  sendEventCreatedMail,
  sendEventDateChangedMail,
  sendEventReminderMail,
  sendDailySummaryMail,
};
