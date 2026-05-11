/**
 * PatchHub v2 - Engagement Tracking Routes
 * View and query all contact interaction history
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { get, all, run } = require('../database');

/**
 * GET /api/engagement
 * Partner-level engagement feed
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { event_type, platform, contact_id, limit = 50, offset = 0, days = 30 } = req.query;

    let where = ['el.partner_id = $1', `el.created_at > NOW() - INTERVAL '${parseInt(days)} days'`];
    let params = [req.partnerId];
    let idx = 2;

    if (event_type) {
      where.push(`el.event_type = $${idx++}`);
      params.push(event_type);
    }
    if (platform) {
      where.push(`el.platform = $${idx++}`);
      params.push(platform);
    }
    if (contact_id) {
      where.push(`el.contact_id = $${idx++}`);
      params.push(contact_id);
    }

    const [events, total] = await Promise.all([
      all(
        `SELECT el.id, el.event_type, el.platform, el.direction, el.body,
                el.metadata, el.created_at,
                c.first_name, c.last_name, c.email,
                d.name as draft_name
         FROM engagement_logs el
         LEFT JOIN contacts c ON c.id = el.contact_id
         LEFT JOIN dm_drafts d ON d.id = el.draft_id
         WHERE ${where.join(' AND ')}
         ORDER BY el.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      get(`SELECT COUNT(*) as total FROM engagement_logs el WHERE ${where.join(' AND ')}`, params)
    ]);

    res.json({ events, total: parseInt(total.total), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('Engagement feed error:', err);
    res.status(500).json({ error: 'Failed to fetch engagement' });
  }
});

/**
 * GET /api/engagement/contact/:id
 * Engagement history for one contact
 */
router.get('/contact/:id', verifyToken, async (req, res) => {
  try {
    const events = await all(
      `SELECT id, event_type, platform, direction, body, metadata, created_at
       FROM engagement_logs
       WHERE contact_id = $1 AND partner_id = $2
       ORDER BY created_at DESC LIMIT 100`,
      [req.params.id, req.partnerId]
    );
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact engagement' });
  }
});

/**
 * GET /api/engagement/summary
 * Aggregated stats for dashboard
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const interval = `${parseInt(days)} days`;

    const [byEvent, byPlatform, dailyTrend] = await Promise.all([
      all(
        `SELECT event_type, COUNT(*) as count
         FROM engagement_logs
         WHERE partner_id = $1 AND created_at > NOW() - INTERVAL $2
         GROUP BY event_type ORDER BY count DESC`,
        [req.partnerId, interval]
      ),
      all(
        `SELECT platform, COUNT(*) as count
         FROM engagement_logs
         WHERE partner_id = $1 AND platform IS NOT NULL AND created_at > NOW() - INTERVAL $2
         GROUP BY platform ORDER BY count DESC`,
        [req.partnerId, interval]
      ),
      all(
        `SELECT DATE(created_at) as date, COUNT(*) as events
         FROM engagement_logs
         WHERE partner_id = $1 AND created_at > NOW() - INTERVAL $2
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [req.partnerId, interval]
      ),
    ]);

    res.json({ by_event: byEvent, by_platform: byPlatform, daily_trend: dailyTrend });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get engagement summary' });
  }
});

/**
 * POST /api/engagement/log
 * Manually log an engagement event
 */
router.post('/log', verifyToken, async (req, res) => {
  try {
    const { contact_id, event_type, platform, direction, body, metadata } = req.body;

    if (!event_type) return res.status(400).json({ error: 'event_type required' });

    const result = await run(
      `INSERT INTO engagement_logs (partner_id, contact_id, event_type, platform, direction, body, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        req.partnerId, contact_id || null, event_type,
        platform || null, direction || 'outbound',
        body || null, metadata ? JSON.stringify(metadata) : '{}'
      ]
    );

    if (contact_id) {
      await run(
        `UPDATE contacts SET last_contacted_at = NOW(), engagement_score = engagement_score + 1
         WHERE id = $1 AND partner_id = $2`,
        [contact_id, req.partnerId]
      );
    }

    res.status(201).json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log engagement' });
  }
});

module.exports = router;
