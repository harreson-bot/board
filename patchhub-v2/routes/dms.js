/**
 * PatchHub v2 - DM Drafts Routes
 * Create, edit, preview, queue, and manage DM campaigns
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { get, all, run } = require('../database');

// ─── Template Variable Substitution ──────────────────────────────────────────

function extractVariables(body) {
  const matches = body.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

function personalizeBody(template, contact) {
  return template
    .replace(/\{\{first_name\}\}/g, contact.first_name || '')
    .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    .replace(/\{\{full_name\}\}/g, `${contact.first_name || ''} ${contact.last_name || ''}`.trim())
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{phone\}\}/g, contact.phone || '')
    .replace(/\{\{company\}\}/g, contact.company || '')
    .replace(/\{\{city\}\}/g, contact.city || '')
    .replace(/\{\{state\}\}/g, contact.state || '');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/dms
 * List all drafts for this partner
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, platform, limit = 50, offset = 0 } = req.query;

    let where = ['partner_id = $1'];
    let params = [req.partnerId];
    let idx = 2;

    if (status) {
      where.push(`status = $${idx++}`);
      params.push(status);
    }
    if (platform) {
      where.push(`platform = $${idx++}`);
      params.push(platform);
    }

    const drafts = await all(
      `SELECT id, name, platform, status, recipient_count, sent_count, failed_count,
              reply_count, tags, scheduled_at, sent_at, created_at, updated_at,
              LEFT(body, 120) as body_preview
       FROM dm_drafts WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(drafts);
  } catch (err) {
    console.error('List drafts error:', err);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

/**
 * GET /api/dms/:id
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const draft = await get(
      'SELECT * FROM dm_drafts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    // Queue stats
    const queueStats = await get(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'sent') as sent,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'skipped') as skipped
       FROM dm_queue WHERE draft_id = $1 AND partner_id = $2`,
      [req.params.id, req.partnerId]
    );

    res.json({ ...draft, queue_stats: queueStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

/**
 * POST /api/dms
 * Create new DM draft
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, body, platform, tags, send_settings, scheduled_at } = req.body;

    if (!name || !body) {
      return res.status(400).json({ error: 'name and body are required' });
    }

    const VALID_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'twitter', 'sms', 'email'];
    const plat = platform || 'instagram';
    if (!VALID_PLATFORMS.includes(plat)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }

    const variables = extractVariables(body);

    const result = await run(
      `INSERT INTO dm_drafts
         (partner_id, name, body, platform, variables, tags, send_settings, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.partnerId, name, body, plat,
        variables,
        Array.isArray(tags) ? tags : [],
        send_settings ? JSON.stringify(send_settings) : '{}',
        scheduled_at || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create draft error:', err);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

/**
 * PUT /api/dms/:id
 * Edit draft (only if draft or paused)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await get(
      'SELECT id, status FROM dm_drafts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!existing) return res.status(404).json({ error: 'Draft not found' });

    if (!['draft', 'paused', 'scheduled'].includes(existing.status)) {
      return res.status(400).json({ error: `Cannot edit a draft with status: ${existing.status}` });
    }

    const { name, body, platform, tags, send_settings, scheduled_at } = req.body;
    const variables = body ? extractVariables(body) : undefined;

    const result = await run(
      `UPDATE dm_drafts SET
         name = COALESCE($1, name),
         body = COALESCE($2, body),
         platform = COALESCE($3, platform),
         variables = COALESCE($4, variables),
         tags = COALESCE($5, tags),
         send_settings = COALESCE($6::jsonb, send_settings),
         scheduled_at = COALESCE($7, scheduled_at)
       WHERE id = $8 AND partner_id = $9
       RETURNING *`,
      [
        name, body, platform, variables,
        Array.isArray(tags) ? tags : null,
        send_settings ? JSON.stringify(send_settings) : null,
        scheduled_at,
        req.params.id, req.partnerId
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update draft error:', err);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

/**
 * DELETE /api/dms/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await run(
      'DELETE FROM dm_drafts WHERE id = $1 AND partner_id = $2 RETURNING id',
      [req.params.id, req.partnerId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Draft not found' });
    res.json({ success: true, deleted_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

/**
 * POST /api/dms/:id/preview
 * Preview draft personalized for a specific contact (or sample)
 */
router.post('/:id/preview', verifyToken, async (req, res) => {
  try {
    const draft = await get(
      'SELECT body, platform, variables FROM dm_drafts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    // Use provided contact or sample
    const contact = req.body.contact || {
      first_name: 'Alex',
      last_name: 'Johnson',
      email: 'alex.johnson@example.com',
      phone: '555-234-5678',
      company: 'Acme Corp',
      city: 'Atlanta',
      state: 'GA'
    };

    const personalized = personalizeBody(draft.body, contact);

    res.json({
      original: draft.body,
      personalized,
      variables: draft.variables,
      platform: draft.platform,
      character_count: personalized.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Preview failed' });
  }
});

/**
 * POST /api/dms/:id/queue
 * Queue draft to send to selected contacts (or tag filter)
 */
router.post('/:id/queue', verifyToken, async (req, res) => {
  try {
    const draft = await get(
      'SELECT * FROM dm_drafts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (!['draft', 'paused', 'scheduled'].includes(draft.status)) {
      return res.status(400).json({ error: `Draft status is ${draft.status}, cannot re-queue` });
    }

    const { contact_ids, tag, exclude_opted_out = true, send_at } = req.body;

    // Resolve recipient list
    let contacts = [];
    if (contact_ids && contact_ids.length > 0) {
      contacts = await all(
        `SELECT id, first_name, last_name, email, phone, company, city, state
         FROM contacts WHERE id = ANY($1::uuid[]) AND partner_id = $2
         ${exclude_opted_out ? 'AND opted_out = FALSE' : ''}`,
        [contact_ids, req.partnerId]
      );
    } else if (tag) {
      contacts = await all(
        `SELECT id, first_name, last_name, email, phone, company, city, state
         FROM contacts WHERE partner_id = $1 AND $2 = ANY(tags)
         ${exclude_opted_out ? 'AND opted_out = FALSE' : ''}`,
        [req.partnerId, tag.toLowerCase()]
      );
    } else {
      return res.status(400).json({ error: 'Provide contact_ids or tag to queue recipients' });
    }

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No eligible contacts found' });
    }

    // Build queue entries (bulk insert)
    const sendTime = send_at ? new Date(send_at) : new Date();

    // Use parameterized batch insert
    const values = contacts.map((c, i) => {
      const personalizedBody = personalizeBody(draft.body, c);
      return [req.partnerId, req.params.id, c.id, draft.platform, personalizedBody, sendTime];
    });

    // Insert in batches of 100
    let queued = 0;
    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100);
      for (const v of batch) {
        await run(
          `INSERT INTO dm_queue (partner_id, draft_id, contact_id, platform, personalized_body, send_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          v
        );
        queued++;
      }
    }

    // Update draft status
    await run(
      `UPDATE dm_drafts SET status = 'queued', recipient_count = $1, scheduled_at = $2
       WHERE id = $3 AND partner_id = $4`,
      [queued, sendTime, req.params.id, req.partnerId]
    );

    // Log engagement event
    await run(
      `INSERT INTO engagement_logs (partner_id, draft_id, event_type, metadata)
       VALUES ($1, $2, 'dm_queued', $3)`,
      [req.partnerId, req.params.id, JSON.stringify({ recipient_count: queued, platform: draft.platform })]
    );

    res.json({
      success: true,
      queued,
      draft_id: req.params.id,
      platform: draft.platform,
      send_at: sendTime
    });
  } catch (err) {
    console.error('Queue error:', err);
    res.status(500).json({ error: 'Queue failed' });
  }
});

/**
 * POST /api/dms/:id/pause
 * Pause a queued/sending draft
 */
router.post('/:id/pause', verifyToken, async (req, res) => {
  try {
    const result = await run(
      `UPDATE dm_drafts SET status = 'paused' WHERE id = $1 AND partner_id = $2
       AND status IN ('queued', 'sending') RETURNING id`,
      [req.params.id, req.partnerId]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Cannot pause draft in current state' });
    res.json({ success: true, message: 'Draft paused' });
  } catch (err) {
    res.status(500).json({ error: 'Pause failed' });
  }
});

/**
 * POST /api/dms/:id/cancel
 */
router.post('/:id/cancel', verifyToken, async (req, res) => {
  try {
    await run(
      `UPDATE dm_drafts SET status = 'cancelled' WHERE id = $1 AND partner_id = $2`,
      [req.params.id, req.partnerId]
    );
    // Cancel pending queue items
    await run(
      `UPDATE dm_queue SET status = 'skipped' WHERE draft_id = $1 AND partner_id = $2 AND status = 'pending'`,
      [req.params.id, req.partnerId]
    );
    res.json({ success: true, message: 'Draft cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Cancel failed' });
  }
});

/**
 * GET /api/dms/:id/queue
 * View queue items for a draft
 */
router.get('/:id/queue', verifyToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let where = ['q.draft_id = $1', 'q.partner_id = $2'];
    let params = [req.params.id, req.partnerId];

    if (status) {
      where.push(`q.status = $${params.length + 1}`);
      params.push(status);
    }

    const items = await all(
      `SELECT q.id, q.status, q.platform, q.send_at, q.sent_at, q.error_msg,
              c.first_name, c.last_name, c.email, c.phone,
              LEFT(q.personalized_body, 80) as body_preview
       FROM dm_queue q
       JOIN contacts c ON c.id = q.contact_id
       WHERE ${where.join(' AND ')}
       ORDER BY q.send_at ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

/**
 * GET /api/dms/stats/overview
 */
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    const stats = await get(
      `SELECT
         COUNT(*) as total_drafts,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
         SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(sent_count) as total_sent,
         SUM(reply_count) as total_replies
       FROM dm_drafts WHERE partner_id = $1`,
      [req.partnerId]
    );
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
