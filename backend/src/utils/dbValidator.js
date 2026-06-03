function validateSingleDatabaseConnection() {
  if (!process.env.DATABASE_URL || String(process.env.DATABASE_URL).trim() === '') {
    return { status: 'no_database_url' };
  }
  return { status: 'valid', localDbs: [] };
}

module.exports = { validateSingleDatabaseConnection };
