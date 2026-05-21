const express = require('express');
const router = express.Router();
const ReputationTracker = require('../services/reputationTracker');
const { validateCompliance } = require('../middleware/complianceGate');
const auth = require('../middleware/auth');

/**
 * GET /api/compliance/report/:partnerId
 * Get detailed compliance report for a partner
 */
router.get('/report/:partnerId', auth, (req, res) => {
  try {
    const { partnerId } = req.params;

    // Verify partner owns this request
    if (req.user.partnerId !== partnerId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const report = ReputationTracker.getComplianceReport(partnerId);
    if (!report) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json(report);
  } catch (err) {
    console.error('Compliance report error:', err);
    res.status(500).json({ error: 'Failed to retrieve compliance report' });
  }
});

/**
 * GET /api/compliance/health/:partnerId
 * Get partner health score (0-100)
 */
router.get('/health/:partnerId', auth, (req, res) => {
  try {
    const { partnerId } = req.params;

    // Verify partner owns this request
    if (req.user.partnerId !== partnerId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const healthScore = ReputationTracker.getHealthScore(partnerId);
    if (healthScore === null) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Determine health status
    let status = 'excellent';
    if (healthScore < 30) status = 'poor';
    else if (healthScore < 60) status = 'fair';
    else if (healthScore < 80) status = 'good';

    res.json({
      partnerId,
      healthScore,
      status,
      recommendation: getRecommendation(healthScore),
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'Failed to retrieve health score' });
  }
});

/**
 * GET /api/compliance/caps
 * Get current sending caps and usage for authenticated partner
 */
router.get('/caps', auth, (req, res) => {
  try {
    const partnerId = req.user.partnerId;
    const db = require('../db');

    // Today's count
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(
      'SELECT COUNT(*) as count FROM dm_queue WHERE partner_id = ? AND DATE(created_at) = ?'
    ).get(partnerId, today);

    // This hour's count
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const hourCount = db.prepare(
      'SELECT COUNT(*) as count FROM dm_queue WHERE partner_id = ? AND created_at > ?'
    ).get(partnerId, oneHourAgo);

    res.json({
      partnerId,
      daily: {
        limit: 5000,
        used: todayCount.count,
        remaining: 5000 - todayCount.count,
      },
      hourly: {
        limit: 500,
        used: hourCount.count,
        remaining: 500 - hourCount.count,
      },
      perContact: {
        limit: 3,
        note: 'Max attempts per unique email address',
      },
    });
  } catch (err) {
    console.error('Caps error:', err);
    res.status(500).json({ error: 'Failed to retrieve caps' });
  }
});

/**
 * POST /api/compliance/webhook/bounce
 * Receive bounce events from SendGrid
 */
router.post('/webhook/bounce', (req, res) => {
  try {
    const { email, partnerId, bounceType } = req.body;

    if (!email || !partnerId) {
      return res.status(400).json({ error: 'Missing email or partnerId' });
    }

    ReputationTracker.logBounce(partnerId, email, bounceType || 'permanent');
    res.json({ logged: true });
  } catch (err) {
    console.error('Bounce webhook error:', err);
    res.status(500).json({ error: 'Failed to log bounce' });
  }
});

/**
 * POST /api/compliance/webhook/complaint
 * Receive complaint events from SendGrid (spam report)
 */
router.post('/webhook/complaint', (req, res) => {
  try {
    const { email, partnerId } = req.body;

    if (!email || !partnerId) {
      return res.status(400).json({ error: 'Missing email or partnerId' });
    }

    ReputationTracker.logComplaint(partnerId, email);
    res.json({ logged: true });
  } catch (err) {
    console.error('Complaint webhook error:', err);
    res.status(500).json({ error: 'Failed to log complaint' });
  }
});

/**
 * Helper: Get recommendation based on health score
 */
function getRecommendation(score) {
  if (score > 90) return 'Excellent sender reputation. Continue current practices.';
  if (score > 70) return 'Good reputation. Monitor bounce rates to maintain quality.';
  if (score > 50) return 'Fair reputation. Review contacts list and message content. Reduce frequency.';
  if (score > 30) return 'Poor reputation. Account at risk of suspension. Audit all contacts immediately.';
  return 'Account disabled. Contact support to discuss remediation plan.';
}

module.exports = router;
