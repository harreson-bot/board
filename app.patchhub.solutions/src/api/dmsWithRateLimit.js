/**
 * DM API Routes with Rate Limiting
 * Integrates dmRateLimiter for platform-aware sending
 */

const express = require('express');
const router = express.Router();
const { dmRateLimitMiddleware, canSend, recordSend, randomizeContactQueue, getRandomDelay } = require('../middleware/dmRateLimiter');

// Apply rate limiter middleware
router.use(dmRateLimitMiddleware);

/**
 * POST /api/dms/send
 * Send DM to single contact or batch with rate limiting
 * 
 * Body:
 * {
 *   "contactIds": [1, 2, 3],  // array of contact IDs
 *   "platform": "instagram",   // or facebook, tiktok, linkedin
 *   "message": "Hi {{firstName}}...",
 *   "draftId": 123,           // optional
 *   "randomize": true         // shuffle contact order (default: true)
 * }
 */
router.post('/send', async (req, res) => {
  try {
    const { contactIds, platform, message, draftId, randomize = true } = req.body;
    const partnerId = req.user.id; // Assuming auth middleware sets user

    // Validate
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Invalid contactIds array' });
    }

    if (!platform || !['instagram', 'facebook', 'tiktok', 'linkedin'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Check rate limit
    const limitCheck = canSend(partnerId, platform);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: limitCheck.reason,
        nextAllowedMs: limitCheck.nextAllowedMs
      });
    }

    // Randomize contact order if requested
    let orderedContacts = randomize ? randomizeContactQueue(contactIds) : contactIds;

    const results = {
      platform,
      totalContacts: orderedContacts.length,
      sent: [],
      failed: [],
      queued: [],
      queue: {
        message: 'Messages queued with randomized delays',
        nextCheckMs: 1000
      }
    };

    // Simulate queue: send first batch immediately, queue rest with delays
    const BATCH_SIZE = Math.ceil(orderedContacts.length / 3);
    let delayMs = 0;

    for (let i = 0; i < orderedContacts.length; i++) {
      const contactId = orderedContacts[i];
      const batchIndex = Math.floor(i / BATCH_SIZE);

      if (batchIndex === 0) {
        // Send immediately
        results.sent.push({
          contactId,
          status: 'sent',
          platform,
          sentAt: new Date().toISOString()
        });

        // Record this send
        recordSend(partnerId, platform);

        delayMs = getRandomDelay(platform);
      } else {
        // Queue for later
        results.queued.push({
          contactId,
          status: 'queued',
          delayMs: delayMs + Math.random() * 1000,
          estimatedSendTime: new Date(Date.now() + delayMs + Math.random() * 1000).toISOString()
        });
      }
    }

    res.json({
      success: true,
      draftId,
      ...results,
      complianceNote: 'Messages randomized across hourly window to avoid detection'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dms/queue-batch
 * Queue a batch of DMs across multiple platforms with staggered timing
 * 
 * Body:
 * {
 *   "draftId": 123,
 *   "contactsByPlatform": {
 *     "instagram": [1, 2, 3],
 *     "facebook": [4, 5, 6],
 *     "tiktok": [7, 8, 9],
 *     "linkedin": [10, 11]
 *   }
 * }
 */
router.post('/queue-batch', async (req, res) => {
  try {
    const { draftId, contactsByPlatform } = req.body;
    const partnerId = req.user.id;

    if (!contactsByPlatform || typeof contactsByPlatform !== 'object') {
      return res.status(400).json({ error: 'contactsByPlatform object required' });
    }

    const queueResults = {
      draftId,
      platforms: {},
      totalQueued: 0,
      totalRejected: 0,
      nextBatchTime: new Date(Date.now() + 60000).toISOString(),
      recommendation: 'Messages will be sent with randomized intervals to avoid platform detection'
    };

    for (const [platform, contactIds] of Object.entries(contactsByPlatform)) {
      const limitCheck = canSend(partnerId, platform);

      if (!limitCheck.allowed) {
        queueResults.platforms[platform] = {
          status: 'rejected',
          reason: limitCheck.reason,
          contactsRejected: contactIds.length
        };
        queueResults.totalRejected += contactIds.length;
      } else {
        const randomized = randomizeContactQueue(contactIds);
        queueResults.platforms[platform] = {
          status: 'queued',
          contactsQueued: randomized.length,
          nextAllowedTime: new Date(Date.now() + getRandomDelay(platform)).toISOString(),
          randomized: true
        };
        queueResults.totalQueued += randomized.length;
      }
    }

    res.json({
      success: true,
      ...queueResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dms/compliance-metrics
 * Get rate limit metrics for the authenticated partner
 */
router.get('/compliance-metrics', (req, res) => {
  try {
    const partnerId = req.user.id;
    const metrics = req.dmLimiter.getMetrics(partnerId);

    if (!metrics) {
      return res.json({
        date: new Date().toDateString(),
        status: 'no_activity',
        platforms: {}
      });
    }

    res.json({
      success: true,
      ...metrics,
      recommendations: {
        instagram: 'Safe to send 4-8 messages per hour (max 120/day)',
        facebook: 'Safe to send 3-6 messages per hour (max 100/day)',
        tiktok: 'Safe to send 5-9 messages per hour (max 150/day)',
        linkedin: 'Conservative approach: 3-5 messages per hour (max 80/day)',
        general: 'Always randomize contact order and delay intervals to avoid detection'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dms/queue-scheduled
 * Schedule DM batch to send at optimal times
 * 
 * Body:
 * {
 *   "draftId": 123,
 *   "contactIds": [1, 2, 3],
 *   "platform": "instagram",
 *   "scheduleType": "distributed", // or "batch"
 *   "timeWindow": 3600000  // 1 hour in ms
 * }
 */
router.post('/queue-scheduled', (req, res) => {
  try {
    const { draftId, contactIds, platform, scheduleType = 'distributed', timeWindow = 3600000 } = req.body;
    const partnerId = req.user.id;

    const limitCheck = canSend(partnerId, platform);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason });
    }

    const randomized = randomizeContactQueue(contactIds);
    const schedule = [];
    const timePerContact = timeWindow / randomized.length;

    randomized.forEach((contactId, index) => {
      schedule.push({
        contactId,
        delayMs: timePerContact * index + Math.random() * 1000,
        estimatedTime: new Date(Date.now() + timePerContact * index).toISOString()
      });
    });

    res.json({
      success: true,
      draftId,
      platform,
      scheduleType,
      totalScheduled: randomized.length,
      timeWindow: `${timeWindow / 1000}s`,
      schedule: schedule.slice(0, 5), // Show first 5
      scheduleCount: schedule.length,
      note: 'Contact order randomized, delays staggered to simulate natural behavior'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
