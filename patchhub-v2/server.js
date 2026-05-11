/**
 * PatchHub v2 - Main Server
 * Multi-tenant CRM Platform
 * Express.js + PostgreSQL
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { initializeSchema } = require('./database');

// Routes
const { router: authRouter } = require('./routes/auth');
const contactsRouter = require('./routes/contacts');
const dmsRouter = require('./routes/dms');
const integrationsRouter = require('./routes/integrations');
const engagementRouter = require('./routes/engagement');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true
}));

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // relaxed for React SPA served from same origin
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter on auth
  message: { error: 'Too many auth attempts' }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads dir exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/dms', dmsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/engagement', engagementRouter);

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'PatchHub API v2',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      contacts: '/api/contacts',
      dms: '/api/dms',
      integrations: '/api/integrations',
      engagement: '/api/engagement',
    }
  });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'frontend', 'dist');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Init DB schema (idempotent)
    await initializeSchema();

    app.listen(PORT, () => {
      console.log(`\n🚀 PatchHub v2 running on port ${PORT}`);
      console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   DB:  ${process.env.DATABASE_URL ? 'PostgreSQL connected' : '⚠️ DATABASE_URL not set'}`);
      console.log(`   API: http://localhost:${PORT}/api\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
