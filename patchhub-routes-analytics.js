const express = require('express');
const router = express.Router();
const { all, get } = require('../database');
const { verifyToken } = require('./auth');

// Get dashboard metrics
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Total contacts
    const contactsResult = await get(
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = ?',
      [req.userId]
    );
    const totalContacts = contactsResult.count;

    // Total campaigns
    const campaignsResult = await get(
      'SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?',
      [req.userId]
    );
    const totalCampaigns = campaignsResult.count;

    // Messages sent
    const messagesResult = await get(
      `SELECT COUNT(*) as count FROM campaign_messages cm
       JOIN campaigns c ON cm.campaign_id = c.id
       WHERE c.user_id = ?`,
      [req.userId]
    );
    const totalMessagesSent = messagesResult.count;

    // Performance metrics
    const performanceResult = await get(
      `SELECT 
        COUNT(CASE WHEN cm.opened_at IS NOT NULL THEN 1 END) as opens,
        COUNT(CASE WHEN cm.clicked_at IS NOT NULL THEN 1 END) as clicks,
        COUNT(CASE WHEN cm.replied_at IS NOT NULL THEN 1 END) as replies
       FROM campaign_messages cm
       JOIN campaigns c ON cm.campaign_id = c.id
       WHERE c.user_id = ?`,
      [req.userId]
    );

    const openRate = totalMessagesSent > 0 
      ? ((performanceResult.opens / totalMessagesSent) * 100).toFixed(2) 
      : 0;
    const clickRate = totalMessagesSent > 0 
      ? ((performanceResult.clicks / totalMessagesSent) * 100).toFixed(2) 
      : 0;
    const replyRate = totalMessagesSent > 0 
      ? ((performanceResult.replies / totalMessagesSent) * 100).toFixed(2) 
      : 0;

    res.json({
      totalContacts,
      totalCampaigns,
      totalMessagesSent,
      performance: {
        opens: performanceResult.opens,
        clicks: performanceResult.clicks,
        replies: performanceResult.replies,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        replyRate: parseFloat(replyRate)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get campaign performance
router.get('/campaigns/:campaignId', verifyToken, async (req, res) => {
  try {
    const campaign = await get(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.campaignId, req.userId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const messages = await all(
      'SELECT * FROM campaign_messages WHERE campaign_id = ?',
      [req.params.campaignId]
    );

    const performance = {
      totalSent: messages.filter(m => m.status !== 'pending').length,
      opened: messages.filter(m => m.opened_at).length,
      clicked: messages.filter(m => m.clicked_at).length,
      replied: messages.filter(m => m.replied_at).length,
      pending: messages.filter(m => m.status === 'pending').length
    };

    performance.openRate = performance.totalSent > 0 
      ? ((performance.opened / performance.totalSent) * 100).toFixed(2) 
      : 0;
    performance.clickRate = performance.totalSent > 0 
      ? ((performance.clicked / performance.totalSent) * 100).toFixed(2) 
      : 0;
    performance.replyRate = performance.totalSent > 0 
      ? ((performance.replied / performance.totalSent) * 100).toFixed(2) 
      : 0;

    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// Get response timeline
router.get('/responses/timeline', verifyToken, async (req, res) => {
  try {
    const responses = await all(
      `SELECT 
        DATE(opened_at) as date,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opens,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as replies
       FROM campaign_messages cm
       JOIN campaigns c ON cm.campaign_id = c.id
       WHERE c.user_id = ? AND (cm.opened_at IS NOT NULL OR cm.replied_at IS NOT NULL)
       GROUP BY DATE(opened_at)
       ORDER BY date DESC`,
      [req.userId]
    );

    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch response timeline' });
  }
});

module.exports = router;
