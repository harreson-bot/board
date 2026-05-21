const db = require('../db');

/**
 * Compliance Gate Middleware
 * Validates all send requests against TCPA/CAN-SPAM rules before queuing
 */

const HARD_CAPS = {
  daily: 5000,      // Max emails per partner per day
  hourly: 500,      // Max emails per partner per hour
  perContact: 3,    // Max sends to same email address
};

const REPUTATION_THRESHOLDS = {
  bounceRate: 0.05,     // >5% bounces = warning
  bounceDisable: 0.10,  // >10% bounces = disable
  complaintRate: 0.001, // >0.1% complaints = warning
  complaintDisable: 0.005, // >0.5% complaints = disable
};

const validateCompliance = async (req, res, next) => {
  try {
    const { partnerId, contactIds, message } = req.body;

    if (!partnerId || !contactIds || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Check daily cap
    const today = new Date().toISOString().split('T')[0];
    const todayCount = db.prepare(
      'SELECT COUNT(*) as count FROM dm_queue WHERE partner_id = ? AND DATE(created_at) = ?'
    ).get(partnerId, today);

    if (todayCount.count + contactIds.length > HARD_CAPS.daily) {
      return res.status(429).json({
        error: 'Daily send cap exceeded',
        limit: HARD_CAPS.daily,
        used: todayCount.count,
        requested: contactIds.length,
      });
    }

    // 2. Check hourly cap
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const hourCount = db.prepare(
      'SELECT COUNT(*) as count FROM dm_queue WHERE partner_id = ? AND created_at > ?'
    ).get(partnerId, oneHourAgo);

    if (hourCount.count + contactIds.length > HARD_CAPS.hourly) {
      return res.status(429).json({
        error: 'Hourly send cap exceeded',
        limit: HARD_CAPS.hourly,
        used: hourCount.count,
        requested: contactIds.length,
      });
    }

    // 3. Check partner reputation
    const partner = db.prepare(
      'SELECT reputation_score, bounce_rate, complaint_rate FROM partners WHERE id = ?'
    ).get(partnerId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (partner.reputation_score < 0) {
      return res.status(403).json({
        error: 'Partner account disabled due to compliance violations',
        reputation: partner.reputation_score,
      });
    }

    if (partner.bounce_rate > REPUTATION_THRESHOLDS.bounceDisable) {
      // Auto-disable
      db.prepare('UPDATE partners SET reputation_score = ? WHERE id = ?').run(-1, partnerId);
      return res.status(403).json({
        error: 'Partner account disabled: bounce rate exceeded',
        bounceRate: partner.bounce_rate,
        threshold: REPUTATION_THRESHOLDS.bounceDisable,
      });
    }

    if (partner.complaint_rate > REPUTATION_THRESHOLDS.complaintDisable) {
      // Auto-disable
      db.prepare('UPDATE partners SET reputation_score = ? WHERE id = ?').run(-1, partnerId);
      return res.status(403).json({
        error: 'Partner account disabled: complaint rate exceeded',
        complaintRate: partner.complaint_rate,
        threshold: REPUTATION_THRESHOLDS.complaintDisable,
      });
    }

    // 4. Check contact-level duplicates
    const contactEmails = db.prepare(
      'SELECT email FROM contacts WHERE id IN (' + contactIds.map(() => '?').join(',') + ')'
    ).all(...contactIds);

    const duplicates = contactEmails.filter(c => {
      const count = db.prepare(
        'SELECT COUNT(*) as count FROM dm_queue WHERE partner_id = ? AND contact_id IN (' +
        'SELECT id FROM contacts WHERE email = ?)'
      ).get(partnerId, c.email);
      return count.count >= HARD_CAPS.perContact;
    });

    if (duplicates.length > 0) {
      return res.status(400).json({
        error: 'Some contacts have reached max sends',
        duplicateEmails: duplicates.map(d => d.email),
        maxPerContact: HARD_CAPS.perContact,
      });
    }

    // 5. Validate consent (basic check - in production, verify import had consent flag)
    const missingConsent = db.prepare(
      'SELECT COUNT(*) as count FROM contacts WHERE id IN (' +
      contactIds.map(() => '?').join(',') + ') AND consent_status != ?'
    ).get(...contactIds, 'confirmed');

    if (missingConsent.count > 0) {
      return res.status(400).json({
        error: 'Some contacts lack proper consent',
        missingConsentCount: missingConsent.count,
      });
    }

    // All checks passed - attach partner data to request for next middleware
    req.compliance = {
      partnerId,
      contactIds,
      message,
      bounceRate: partner.bounce_rate,
      complaintRate: partner.complaint_rate,
      reputationScore: partner.reputation_score,
    };

    next();
  } catch (err) {
    console.error('Compliance gate error:', err);
    res.status(500).json({ error: 'Compliance validation failed', details: err.message });
  }
};

module.exports = { validateCompliance, HARD_CAPS, REPUTATION_THRESHOLDS };
