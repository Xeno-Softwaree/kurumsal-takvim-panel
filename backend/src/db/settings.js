const { get, run } = require('./index');

async function getSetting(key) {
  const row = await get('SELECT value FROM settings WHERE key = $1', [key]);
  return row ? row.value : null;
}

async function setSetting(key, value) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}

module.exports = {
  getSetting,
  setSetting,
};
