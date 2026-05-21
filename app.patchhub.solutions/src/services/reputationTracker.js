const db = require('../db');

/**
 * Reputation Tracking System
 * Monitors partner bounce/complaint rates and auto-disables bad actors
 */

class ReputationTracker {
  /**
   * Log a send event
   */
  static logSend(partnerId, contactId, email, messageId) {
    db.prepare(`
      INSERT INTO send_logs (partner_id, contact_id, email, message_id, status, sent_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(partnerId, contactId, email, messageId, 'sent');

    return { logged: true, partnerId, contactId, email, messageId };
  }

  /**
   * Log a bounce event
   */
  static logBounce(partnerId, email, bounceType = 'permanent') {
    db.prepare(`
      INSERT INTO bounce_logs (partner_id, email, bounce_type, logged_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(partnerId, email, bounceType);

    this._updatePartnerBounceRate(partnerId);
    return { logged: true, partnerId, email, bounceType };
  }

  /**
   * Log a complaint event (spam report)
   */
  static logComplaint(partnerId, email) {
    db.prepare(`
      INSERT INTO complaint_logs (partner_id, email, logged_at)
      VALUES (?, ?, datetime('now'))
    `).run(partnerId, email);

    this._updatePartnerComplaintRate(partnerId);
    return { logged: true, partnerId, email };
  }

  /**
   * Calculate bounce rate for a partner
   */
  static _updatePartnerBounceRate(partnerId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    const totalSends = db.prepare(`
      SELECT COUNT(*) as count FROM send_logs
      WHERE partner_id = ? AND sent_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const totalBounces = db.prepare(`
      SELECT COUNT(*) as count FROM bounce_logs
      WHERE partner_id = ? AND logged_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const bounceRate = totalSends.count > 0 ? totalBounces.count / totalSends.count : 0;

    db.prepare(`
      UPDATE partners SET bounce_rate = ? WHERE id = ?
    `).run(bounceRate, partnerId);

    return bounceRate;
  }

  /**
   * Calculate complaint rate for a partner
   */
  static _updatePartnerComplaintRate(partnerId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    const totalSends = db.prepare(`
      SELECT COUNT(*) as count FROM send_logs
      WHERE partner_id = ? AND sent_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const totalComplaints = db.prepare(`
      SELECT COUNT(*) as count FROM complaint_logs
      WHERE partner_id = ? AND logged_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const complaintRate = totalSends.count > 0 ? totalComplaints.count / totalSends.count : 0;

    db.prepare(`
      UPDATE partners SET complaint_rate = ? WHERE id = ?
    `).run(complaintRate, partnerId);

    return complaintRate;
  }

  /**
   * Get partner health score (0-100)
   */
  static getHealthScore(partnerId) {
    const partner = db.prepare(`
      SELECT bounce_rate, complaint_rate, reputation_score FROM partners WHERE id = ?
    `).get(partnerId);

    if (!partner) return null;

    // Score calculation: starts at 100, deduct for bounces and complaints
    let score = 100;
    score -= partner.bounce_rate * 100 * 3;     // Bounces are 3x weight
    score -= partner.complaint_rate * 100 * 5;  // Complaints are 5x weight
    score = Math.max(0, Math.min(100, score));  // Clamp 0-100

    // If disabled, return 0
    if (partner.reputation_score < 0) return 0;

    return score;
  }

  /**
   * Get partner compliance report
   */
  static getComplianceReport(partnerId) {
    const partner = db.prepare(`
      SELECT * FROM partners WHERE id = ?
    `).get(partnerId);

    if (!partner) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN status = 'sent' THEN 1 END) as total_sent,
        COUNT(DISTINCT CASE WHEN status = 'delivered' THEN 1 END) as total_delivered,
        COUNT(DISTINCT CASE WHEN status = 'failed' THEN 1 END) as total_failed
      FROM send_logs
      WHERE partner_id = ? AND sent_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const bounces = db.prepare(`
      SELECT COUNT(*) as count FROM bounce_logs
      WHERE partner_id = ? AND logged_at > ?
    `).get(partnerId, thirtyDaysAgo);

    const complaints = db.prepare(`
      SELECT COUNT(*) as count FROM complaint_logs
      WHERE partner_id = ? AND logged_at > ?
    `).get(partnerId, thirtyDaysAgo);

    return {
      partnerId,
      disabled: partner.reputation_score < 0,
      healthScore: this.getHealthScore(partnerId),
      bounceRate: partner.bounce_rate,
      complaintRate: partner.complaint_rate,
      reputationScore: partner.reputation_score,
      stats30days: {
        totalSent: stats.total_sent || 0,
        totalDelivered: stats.total_delivered || 0,
        totalFailed: stats.total_failed || 0,
        totalBounces: bounces.count,
        totalComplaints: complaints.count,
      },
    };
  }

  /**
   * Enable partner (reset reputation)
   */
  static enablePartner(partnerId) {
    db.prepare(`
      UPDATE partners
      SET reputation_score = 100, bounce_rate = 0, complaint_rate = 0
      WHERE id = ?
    `).run(partnerId);

    return { enabled: true, partnerId };
  }

  /**
   * Disable partner
   */
  static disablePartner(partnerId, reason) {
    db.prepare(`
      UPDATE partners
      SET reputation_score = -1
      WHERE id = ?
    `).run(partnerId);

    db.prepare(`
      INSERT INTO compliance_logs (partner_id, action, reason, logged_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(partnerId, 'disabled', reason);

    return { disabled: true, partnerId, reason };
  }
}

module.exports = ReputationTracker;
