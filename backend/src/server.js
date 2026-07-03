const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const {
  port,
  frontendOrigin,
  rateLimitMax,
  rateLimitWindowMs,
} = require('./config/env');
const { initDatabase, testConnection } = require('./db');
const { createDefaultAdmin } = require('./db/seed');
const authRoutes = require('./routes/auth').router;
const adminRoutes = require('./routes/admins');
const eventRoutes = require('./routes/events');
const activityLogRoutes = require('./routes/activityLogs');
const statsRoutes = require('./routes/stats');
const mailRoutes = require('./routes/mail');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const documentRoutes = require('./routes/documents');
const reminderRoutes = require('./routes/reminders');
const departmentRoutes = require('./routes/departments');
const directorateRoutes = require('./routes/directorates');
const staffRoutes = require('./routes/staff');
const inventoryRoutes = require('./routes/inventory');
const { startScheduler } = require('./services/scheduler');
const { validateSingleDatabaseConnection } = require('./utils/dbValidator');
async function bootstrap() {
  const dbStatus = validateSingleDatabaseConnection();
  if (dbStatus.status === 'no_database_url') {
    console.warn('DATABASE_URL is not set!');
  }

  await testConnection();
  await initDatabase();
  await createDefaultAdmin();

  const app = express();

  // Enable trust proxy for Render and other reverse proxies
  // This ensures the real IP address is used for rate limiting instead of the proxy's IP.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: frontendOrigin || '*', credentials: true }));
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const apiLimiter = rateLimit({
    windowMs: rateLimitWindowMs || 15 * 60 * 1000,
    max: rateLimitMax || 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' }
  });

  app.get('/health', async (req, res) => {
    try {
      const { pool } = require('./db');
      await pool.query('SELECT 1');
      res.json({ status: 'OK', database: 'connected' });
    } catch (err) {
      console.error('Health check database error:', err);
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth', loginLimiter, authRoutes);
  app.use('/api/admins', adminRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/activity-logs', activityLogRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/mail', mailRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/directorates', directorateRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/inventory', inventoryRoutes);

  // Generic error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Beklenmeyen bir hata oluştu' });
  });

  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });

  startScheduler();
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
