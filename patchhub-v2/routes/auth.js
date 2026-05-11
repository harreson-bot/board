/**
 * PatchHub v2 - Auth Routes
 * Partner self-signup, login, JWT middleware
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../database');
const { seedTestAccount } = require('../scripts/seed');

const JWT_SECRET = process.env.JWT_SECRET || 'patchhub-dev-secret-CHANGE-IN-PROD';
const JWT_EXPIRES = '30d';

// ─── Middleware ───────────────────────────────────────────────────────────────

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.partnerId = decoded.partnerId;
    req.partnerUsername = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Partner self-signup — creates account + auto-seeds 50 sample leads
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, display_name, company } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 chars, letters/numbers/underscore/hyphen only' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check uniqueness
    const existingUser = await get('SELECT id FROM partners WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await run(
      `INSERT INTO partners (username, email, password_hash, display_name, company)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, display_name, company, plan, status, api_key, trial_ends_at, created_at`,
      [username, email, passwordHash, display_name || username, company || null]
    );

    const partner = result.rows[0];

    // Auto-seed 50 sample leads for demo
    try {
      await seedTestAccount(partner.id, partner.username);
      console.log(`✅ Seeded test account for partner: ${partner.username}`);
    } catch (seedErr) {
      console.warn('⚠️ Seeding failed (non-fatal):', seedErr.message);
    }

    const token = jwt.sign(
      { partnerId: partner.id, username: partner.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({
      success: true,
      token,
      partner: {
        id: partner.id,
        username: partner.username,
        email: partner.email,
        display_name: partner.display_name,
        company: partner.company,
        plan: partner.plan,
        trial_ends_at: partner.trial_ends_at,
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    // Allow login by username OR email
    const partner = await get(
      'SELECT * FROM partners WHERE username = $1 OR email = $1',
      [username]
    );

    if (!partner) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (partner.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended — contact support' });
    }

    const valid = await bcrypt.compare(password, partner.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { partnerId: partner.id, username: partner.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      partner: {
        id: partner.id,
        username: partner.username,
        email: partner.email,
        display_name: partner.display_name,
        company: partner.company,
        plan: partner.plan,
        trial_ends_at: partner.trial_ends_at,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const partner = await get(
      'SELECT id, username, email, display_name, company, plan, status, api_key, trial_ends_at, settings, created_at FROM partners WHERE id = $1',
      [req.partnerId]
    );
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json(partner);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update display name, company, settings
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { display_name, company, settings } = req.body;
    const updated = await run(
      `UPDATE partners SET display_name = COALESCE($1, display_name),
        company = COALESCE($2, company),
        settings = COALESCE($3::jsonb, settings)
       WHERE id = $4
       RETURNING id, username, email, display_name, company, plan, settings`,
      [display_name, company, settings ? JSON.stringify(settings) : null, req.partnerId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const partner = await get('SELECT password_hash FROM partners WHERE id = $1', [req.partnerId]);
    const valid = await bcrypt.compare(current_password, partner.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await run('UPDATE partners SET password_hash = $1 WHERE id = $2', [hash, req.partnerId]);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = { router, verifyToken };
