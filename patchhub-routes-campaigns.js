const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../database');
const { verifyToken } = require('./auth');

// Create campaign
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, template, recipientIds } = req.body;

    if (!name || !template) {
      return res.status(400).json({ error: 'Campaign name and template required' });
    }

    const campaignId = uuidv4();
    const totalRecipients = recipientIds ? recipientIds.length : 0;

    await run(
      `INSERT INTO campaigns 
       (id, user_id, name, template, status, total_recipients)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [campaignId, req.userId, name, template, 'draft', totalRecipients]
    );

    res.json({
      success: true,
      campaignId,
      message: 'Campaign created'
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get all campaigns for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const campaigns = await all(
      `SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
      [req.userId]
    );

    // Calculate performance metrics for each campaign
    for (let campaign of campaigns) {
      const messages = await all(
        `SELECT status FROM campaign_messages WHERE campaign_id = ?`,
        [campaign.id]
      );

      const metrics = {
        sent: messages.filter(m => m.status !== 'pending').length,
        opened: messages.filter(m => m.opened_at).length,
        clicked: messages.filter(m => m.clicked_at).length,
        replied: messages.filter(m => m.replied_at).length
      };

      campaign.metrics = metrics;
      campaign.openRate = metrics.sent > 0 ? ((metrics.opened / metrics.sent) * 100).toFixed(2) : 0;
      campaign.clickRate = metrics.sent > 0 ? ((metrics.clicked / metrics.sent) * 100).toFixed(2) : 0;
      campaign.replyRate = metrics.sent > 0 ? ((metrics.replied / metrics.sent) * 100).toFixed(2) : 0;
    }

    res.json(campaigns);
  } catch (error) {
    console.error('Campaign fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const campaign = await get(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get messages for campaign
    const messages = await all(
      `SELECT cm.*, c.first_name, c.last_name, c.email
       FROM campaign_messages cm
       JOIN contacts c ON cm.contact_id = c.id
       WHERE cm.campaign_id = ?
       ORDER BY cm.created_at DESC`,
      [req.params.id]
    );

    campaign.messages = messages;

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Launch campaign (send DMs)
router.post('/:id/launch', verifyToken, async (req, res) => {
  try {
    const campaign = await get(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign already launched or completed' });
    }

    // Get all contacts for user
    const contacts = await all(
      'SELECT id, first_name, last_name, email FROM contacts WHERE user_id = ?',
      [req.userId]
    );

    let sentCount = 0;

    // Simulate sending DMs to all contacts
    for (const contact of contacts) {
      const messageId = uuidv4();
      const personalizedMessage = campaign.template
        .replace('[FirstName]', contact.first_name || '')
        .replace('[LastName]', contact.last_name || '')
        .replace('[Email]', contact.email || '');

      await run(
        `INSERT INTO campaign_messages 
         (id, campaign_id, contact_id, message_body, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [messageId, req.params.id, contact.id, personalizedMessage, 'sent', new Date().toISOString()]
      );

      sentCount++;

      // Simulate some responses (10% chance)
      if (Math.random() < 0.1) {
        setTimeout(() => {
          const replies = [
            'Yes, I\'m interested! Tell me more.',
            'This looks great, let\'s connect.',
            'When can we chat?',
            'I\'d like to learn more about this.'
          ];
          const randomReply = replies[Math.floor(Math.random() * replies.length)];
          run(
            'UPDATE campaign_messages SET status = ?, replied_at = ?, reply_text = ? WHERE id = ?',
            ['replied', new Date().toISOString(), randomReply, messageId]
          );
        }, Math.random() * 3600000); // Random time within 1 hour
      }
    }

    // Update campaign status
    await run(
      'UPDATE campaigns SET status = ?, launched_at = ?, sent_count = ? WHERE id = ?',
      ['launched', new Date().toISOString(), sentCount, req.params.id]
    );

    res.json({
      success: true,
      campaignId: req.params.id,
      messagesSent: sentCount,
      message: `Campaign launched! ${sentCount} DMs sent.`
    });
  } catch (error) {
    console.error('Campaign launch error:', error);
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// Update campaign
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const campaign = await get(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { name, template } = req.body;

    await run(
      'UPDATE campaigns SET name = ?, template = ? WHERE id = ?',
      [name || campaign.name, template || campaign.template, req.params.id]
    );

    res.json({ success: true, message: 'Campaign updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const campaign = await get(
      'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Delete associated messages
    await run('DELETE FROM campaign_messages WHERE campaign_id = ?', [req.params.id]);

    // Delete campaign
    await run('DELETE FROM campaigns WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
