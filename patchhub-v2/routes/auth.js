/**
 * PatchHub v2 - Auth Routes (SQLite)
 * Partner self-signup, login, JWT middleware
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run, all } = require('../database');
const { seedTestAccount } = require('../scripts/seed');

const JWT_SECRET = process.env.JWT_SECRET || 'patchhub-dev-secret-CHANGE-IN-PROD';
const JWT_EXPIRES = '30d';

// Middleware
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

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, display_name, company } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password required' });
    }

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username invalid' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be 8+ chars' });
    }

    const existing = await get('SELECT id FROM partners WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(409).json({ error: 'Username or email taken' });
    }

    const partnerId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await run(
      `INSERT INTO partners (id, username, email, password_hash, full_name, company)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [partnerId, username, email, passwordHash, display_name || username, company || null]
    );

    const partner = await get('SELECT id, username, email, full_name, company FROM partners WHERE id = ?', [partnerId]);

    try {
      await seedTestAccount(partnerId, username);
    } catch (seedErr) {
      console.warn('Seeding failed:', seedErr.message);
    }

    const token = jwt.sign(
      { partnerId: partner.id, username: partner.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      partner: { ...partner, plan: 'free' }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username/email and password required' });
    }

    // Allow login with either username or email
    const partner = await get(
      'SELECT * FROM partners WHERE username = ? OR email = ?',
      [username, username]
    );
    if (!partner) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, partner.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { partnerId: partner.id, username: partner.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      partner: {
        id: partner.id,
        username: partner.username,
        email: partner.email,
        display_name: partner.full_name || partner.username,
        company: partner.company,
        plan: 'free'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const partner = await get('SELECT id, username, email, full_name, company FROM partners WHERE id = ?', [req.partnerId]);
    
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({ ...partner, display_name: partner.full_name || partner.username, plan: 'free' });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { display_name, company } = req.body;

    await run(
      'UPDATE partners SET full_name = ?, company = ? WHERE id = ?',
      [display_name, company, req.partnerId]
    );

    const updated = await get('SELECT id, username, email, full_name, company FROM partners WHERE id = ?', [req.partnerId]);
    res.json({ ...updated, display_name: updated.full_name || updated.username, plan: 'free' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const partner = await get('SELECT password_hash FROM partners WHERE id = ?', [req.partnerId]);
    const match = await bcrypt.compare(oldPassword, partner.password_hash);
    
    if (!match) {
      return res.status(401).json({ error: 'Old password incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await run('UPDATE partners SET password_hash = ? WHERE id = ?', [newHash, req.partnerId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = { router, verifyToken };
