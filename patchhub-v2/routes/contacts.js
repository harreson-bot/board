/**
 * PatchHub v2 - Contacts Routes
 * CSV/VCF import, duplicate detection, CRUD, search, tags, engagement logging
 * Port of Rick CRM patterns upgraded for PostgreSQL multi-tenant
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('./auth');
const { query, get, all, run, pool } = require('../database');

// File upload config
const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 }
});

// ─── Column Auto-Detection (ported from Rick CRM) ────────────────────────────

const COLUMN_PATTERNS = {
  first_name: [/^first.?name$/i, /^fname$/i, /^first$/i, /^given.?name$/i],
  last_name: [/^last.?name$/i, /^lname$/i, /^last$/i, /^surname$/i, /^family.?name$/i],
  email: [/^e.?mail/i, /^email.?address/i],
  phone: [/^phone/i, /^mobile/i, /^cell/i, /^tel/i, /^contact.?number/i],
  company: [/^company/i, /^organization/i, /^org$/i, /^employer/i, /^business/i],
  title: [/^title$/i, /^job.?title/i, /^position/i, /^role$/i],
  website: [/^website/i, /^url$/i, /^web$/i],
  address: [/^address/i, /^street/i],
  city: [/^city$/i, /^town$/i],
  state: [/^state$/i, /^province$/i, /^region$/i],
  zip: [/^zip$/i, /^postal/i, /^post.?code/i],
  country: [/^country$/i, /^nation$/i],
  notes: [/^notes?$/i, /^comment/i, /^description/i, /^remark/i],
  tags: [/^tags?$/i, /^label/i, /^categor/i],
};

function detectColumn(header) {
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    if (patterns.some(p => p.test(header.trim()))) return field;
  }
  return null;
}

function buildColumnMap(headers) {
  const map = {};
  for (const h of headers) {
    const field = detectColumn(h);
    if (field && !map[field]) map[field] = h;
  }
  return map;
}

// ─── Phone Normalization (Rick pattern) ──────────────────────────────────────

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits.length > 5 ? digits : null;
}

function formatPhone(phone) {
  const d = normalizePhone(phone);
  if (!d || d.length !== 10) return phone || '';
  return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

async function findDuplicate(partnerId, email, phone) {
  const phoneNorm = normalizePhone(phone);
  if (email) {
    const byEmail = await get(
      'SELECT id FROM contacts WHERE partner_id = $1 AND email = $2',
      [partnerId, email.toLowerCase().trim()]
    );
    if (byEmail) return byEmail;
  }
  if (phoneNorm) {
    const byPhone = await get(
      'SELECT id FROM contacts WHERE partner_id = $1 AND phone_normalized = $2',
      [partnerId, phoneNorm]
    );
    if (byPhone) return byPhone;
  }
  return null;
}

// ─── Tag helpers ─────────────────────────────────────────────────────────────

async function upsertTags(partnerId, tagNames) {
  if (!tagNames || tagNames.length === 0) return;
  for (const name of tagNames) {
    await run(
      `INSERT INTO tags (partner_id, name) VALUES ($1, $2)
       ON CONFLICT (partner_id, name) DO UPDATE SET contact_count = tags.contact_count + 1`,
      [partnerId, name.trim().toLowerCase()]
    );
  }
}

// ─── Engagement log helper ────────────────────────────────────────────────────

async function logEngagement(partnerId, contactId, eventType, metadata = {}) {
  await run(
    `INSERT INTO engagement_logs (partner_id, contact_id, event_type, metadata)
     VALUES ($1, $2, $3, $4)`,
    [partnerId, contactId, eventType, JSON.stringify(metadata)]
  );
  // Update contact last_contacted_at and engagement score
  await run(
    `UPDATE contacts SET last_contacted_at = NOW(), engagement_score = engagement_score + 1
     WHERE id = $1 AND partner_id = $2`,
    [contactId, partnerId]
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/contacts
 * List contacts with search, filter, pagination
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      search, tag, source, opted_out, limit = 50, offset = 0, sort = 'created_at', order = 'DESC'
    } = req.query;

    const validSorts = ['created_at', 'last_name', 'first_name', 'engagement_score', 'last_contacted_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order === 'ASC' ? 'ASC' : 'DESC';

    let where = ['partner_id = $1'];
    let params = [req.partnerId];
    let idx = 2;

    if (search) {
      where.push(`(
        first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR
        email ILIKE $${idx} OR phone ILIKE $${idx} OR company ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    if (tag) {
      where.push(`$${idx} = ANY(tags)`);
      params.push(tag.toLowerCase());
      idx++;
    }

    if (source) {
      where.push(`source = $${idx}`);
      params.push(source);
      idx++;
    }

    if (opted_out !== undefined) {
      where.push(`opted_out = $${idx}`);
      params.push(opted_out === 'true');
      idx++;
    }

    const whereClause = where.join(' AND ');

    const [contacts, countResult] = await Promise.all([
      all(
        `SELECT id, first_name, last_name, email, phone, company, title, tags, source,
                engagement_score, last_contacted_at, opted_out, created_at
         FROM contacts WHERE ${whereClause}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      get(`SELECT COUNT(*) as total FROM contacts WHERE ${whereClause}`, params)
    ]);

    res.json({
      contacts,
      total: parseInt(countResult.total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('List contacts error:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * GET /api/contacts/:id
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const contact = await get(
      'SELECT * FROM contacts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Fetch recent engagement
    const recent = await all(
      `SELECT event_type, platform, direction, body, metadata, created_at
       FROM engagement_logs WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...contact, engagement_history: recent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * POST /api/contacts
 * Create single contact manually
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, company, title, website,
      address, city, state, zip, country, tags, notes, source, custom_fields
    } = req.body;

    if (!first_name && !email && !phone) {
      return res.status(400).json({ error: 'At least one of: first_name, email, phone required' });
    }

    const phoneNorm = normalizePhone(phone);

    // Dupe check
    const dupe = await findDuplicate(req.partnerId, email, phone);
    if (dupe) {
      return res.status(409).json({ error: 'Duplicate contact detected', existing_id: dupe.id });
    }

    const tagList = Array.isArray(tags) ? tags.map(t => t.toLowerCase()) : [];
    await upsertTags(req.partnerId, tagList);

    const result = await run(
      `INSERT INTO contacts
         (partner_id, first_name, last_name, email, phone, phone_normalized,
          company, title, website, address, city, state, zip, country,
          tags, notes, source, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        req.partnerId, first_name, last_name,
        email ? email.toLowerCase().trim() : null,
        phone ? formatPhone(phone) : null,
        phoneNorm,
        company, title, website, address, city, state, zip, country || 'US',
        tagList, notes, source || 'manual',
        custom_fields ? JSON.stringify(custom_fields) : '{}'
      ]
    );

    await logEngagement(req.partnerId, result.rows[0].id, 'contact_created', { source: source || 'manual' });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PUT /api/contacts/:id
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await get(
      'SELECT id FROM contacts WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!existing) return res.status(404).json({ error: 'Contact not found' });

    const {
      first_name, last_name, email, phone, company, title, website,
      address, city, state, zip, country, tags, notes, custom_fields
    } = req.body;

    const phoneNorm = phone ? normalizePhone(phone) : undefined;
    const tagList = Array.isArray(tags) ? tags.map(t => t.toLowerCase()) : undefined;
    if (tagList) await upsertTags(req.partnerId, tagList);

    const result = await run(
      `UPDATE contacts SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         phone_normalized = COALESCE($5, phone_normalized),
         company = COALESCE($6, company),
         title = COALESCE($7, title),
         website = COALESCE($8, website),
         address = COALESCE($9, address),
         city = COALESCE($10, city),
         state = COALESCE($11, state),
         zip = COALESCE($12, zip),
         country = COALESCE($13, country),
         tags = COALESCE($14, tags),
         notes = COALESCE($15, notes),
         custom_fields = COALESCE($16::jsonb, custom_fields)
       WHERE id = $17 AND partner_id = $18
       RETURNING *`,
      [
        first_name, last_name,
        email ? email.toLowerCase().trim() : null,
        phone ? formatPhone(phone) : null,
        phoneNorm,
        company, title, website, address, city, state, zip, country,
        tagList, notes,
        custom_fields ? JSON.stringify(custom_fields) : null,
        req.params.id, req.partnerId
      ]
    );

    await logEngagement(req.partnerId, req.params.id, 'contact_updated');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * DELETE /api/contacts/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await run(
      'DELETE FROM contacts WHERE id = $1 AND partner_id = $2 RETURNING id',
      [req.params.id, req.partnerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true, deleted_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

/**
 * POST /api/contacts/:id/opt-out
 */
router.post('/:id/opt-out', verifyToken, async (req, res) => {
  try {
    await run(
      'UPDATE contacts SET opted_out = TRUE, opted_out_at = NOW() WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    await logEngagement(req.partnerId, req.params.id, 'opt_out');
    res.json({ success: true, message: 'Contact opted out' });
  } catch (err) {
    res.status(500).json({ error: 'Opt-out failed' });
  }
});

/**
 * POST /api/contacts/import/csv
 * Upload & parse CSV — auto-detects columns, deduplicates, imports
 */
router.post('/import/csv', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Start import record
  const importResult = await run(
    `INSERT INTO contact_imports (partner_id, filename, import_type, status)
     VALUES ($1, $2, 'csv', 'processing') RETURNING id`,
    [req.partnerId, req.file.originalname]
  );
  const importId = importResult.rows[0].id;

  // Process async (return importId immediately for polling)
  res.json({ success: true, import_id: importId, message: 'Import started' });

  // Process file
  processCsvImport(req.partnerId, importId, req.file.path, req.file.originalname)
    .catch(err => console.error('CSV import error:', err));
});

async function processCsvImport(partnerId, importId, filePath, filename) {
  const rows = [];
  let headers = null;
  let columnMap = null;

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (h) => {
        headers = h;
        columnMap = buildColumnMap(h);
      })
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  let imported = 0, duplicates = 0, errors = 0, skipped = 0;
  const errorLog = [];

  for (const row of rows) {
    try {
      const mapped = {};
      for (const [field, header] of Object.entries(columnMap)) {
        mapped[field] = row[header] ? row[header].trim() : null;
      }

      const email = mapped.email ? mapped.email.toLowerCase() : null;
      const phone = mapped.phone;
      const phoneNorm = normalizePhone(phone);

      if (!mapped.first_name && !email && !phone) {
        skipped++;
        continue;
      }

      // Dupe detection
      const dupe = await findDuplicate(partnerId, email, phone);
      if (dupe) {
        duplicates++;
        continue;
      }

      const tags = mapped.tags
        ? mapped.tags.split(/[,;|]/).map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];
      await upsertTags(partnerId, tags);

      const result = await run(
        `INSERT INTO contacts
           (partner_id, first_name, last_name, email, phone, phone_normalized,
            company, title, website, address, city, state, zip, country, tags, notes, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'csv_import')
         RETURNING id`,
        [
          partnerId,
          mapped.first_name, mapped.last_name,
          email,
          phone ? formatPhone(phone) : null,
          phoneNorm,
          mapped.company, mapped.title, mapped.website,
          mapped.address, mapped.city, mapped.state, mapped.zip, mapped.country || 'US',
          tags, mapped.notes
        ]
      );

      await logEngagement(partnerId, result.rows[0].id, 'contact_created', { source: 'csv_import', filename });
      imported++;
    } catch (err) {
      errors++;
      errorLog.push({ row: JSON.stringify(row).substring(0, 100), error: err.message });
    }
  }

  // Update import record
  await run(
    `UPDATE contact_imports SET
       total_rows = $1, imported_count = $2, duplicate_count = $3,
       skipped_count = $4, error_count = $5, status = 'complete', error_log = $6
     WHERE id = $7`,
    [rows.length, imported, duplicates, skipped, errors, JSON.stringify(errorLog), importId]
  );

  // Cleanup temp file
  try { fs.unlinkSync(filePath); } catch {}

  console.log(`✅ CSV import ${importId}: ${imported} imported, ${duplicates} dupes, ${errors} errors`);
}

/**
 * POST /api/contacts/import/vcf
 * Import VCard (.vcf) file
 */
router.post('/import/vcf', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const importResult = await run(
    `INSERT INTO contact_imports (partner_id, filename, import_type, status)
     VALUES ($1, $2, 'vcf', 'processing') RETURNING id`,
    [req.partnerId, req.file.originalname]
  );
  const importId = importResult.rows[0].id;

  res.json({ success: true, import_id: importId, message: 'VCF import started' });

  processVcfImport(req.partnerId, importId, req.file.path, req.file.originalname)
    .catch(err => console.error('VCF import error:', err));
});

async function processVcfImport(partnerId, importId, filePath, filename) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Parse vCards manually (simple parser for standard vCard 2.1/3.0)
  const vcards = content.split(/BEGIN:VCARD/i).filter(s => s.trim().length > 0);

  let imported = 0, duplicates = 0, errors = 0;

  for (const vcard of vcards) {
    try {
      const lines = vcard.split(/\r?\n/);
      const fields = {};

      for (const line of lines) {
        const [key, ...rest] = line.split(':');
        const value = rest.join(':').trim();
        const baseKey = key.split(';')[0].toUpperCase();
        if (baseKey === 'FN') fields.full_name = value;
        if (baseKey === 'N') {
          const parts = value.split(';');
          fields.last_name = parts[0] || '';
          fields.first_name = parts[1] || '';
        }
        if (baseKey.startsWith('EMAIL')) fields.email = value.toLowerCase();
        if (baseKey.startsWith('TEL')) fields.phone = value;
        if (baseKey === 'ORG') fields.company = value.split(';')[0];
        if (baseKey === 'TITLE') fields.title = value;
        if (baseKey === 'URL') fields.website = value;
        if (baseKey.startsWith('ADR')) {
          const parts = value.split(';');
          fields.address = parts[2] || '';
          fields.city = parts[3] || '';
          fields.state = parts[4] || '';
          fields.zip = parts[5] || '';
          fields.country = parts[6] || 'US';
        }
        if (baseKey === 'NOTE') fields.notes = value;
      }

      if (!fields.first_name && fields.full_name) {
        const parts = fields.full_name.split(' ');
        fields.first_name = parts[0] || '';
        fields.last_name = parts.slice(1).join(' ') || '';
      }

      if (!fields.first_name && !fields.email && !fields.phone) continue;

      const dupe = await findDuplicate(partnerId, fields.email, fields.phone);
      if (dupe) { duplicates++; continue; }

      const phoneNorm = normalizePhone(fields.phone);
      const result = await run(
        `INSERT INTO contacts
           (partner_id, first_name, last_name, email, phone, phone_normalized,
            company, title, website, address, city, state, zip, country, notes, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'vcf_import')
         RETURNING id`,
        [
          partnerId,
          fields.first_name, fields.last_name, fields.email,
          fields.phone ? formatPhone(fields.phone) : null,
          phoneNorm,
          fields.company, fields.title, fields.website,
          fields.address, fields.city, fields.state, fields.zip, fields.country || 'US',
          fields.notes
        ]
      );

      await logEngagement(partnerId, result.rows[0].id, 'contact_created', { source: 'vcf_import', filename });
      imported++;
    } catch (err) {
      errors++;
    }
  }

  await run(
    `UPDATE contact_imports SET
       total_rows = $1, imported_count = $2, duplicate_count = $3,
       error_count = $4, status = 'complete'
     WHERE id = $5`,
    [vcards.length, imported, duplicates, errors, importId]
  );

  try { fs.unlinkSync(filePath); } catch {}
  console.log(`✅ VCF import ${importId}: ${imported} imported, ${duplicates} dupes`);
}

/**
 * GET /api/contacts/imports/status/:id
 * Poll import status
 */
router.get('/imports/status/:id', verifyToken, async (req, res) => {
  try {
    const imp = await get(
      'SELECT * FROM contact_imports WHERE id = $1 AND partner_id = $2',
      [req.params.id, req.partnerId]
    );
    if (!imp) return res.status(404).json({ error: 'Import not found' });
    res.json(imp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get import status' });
  }
});

/**
 * GET /api/contacts/imports/list
 */
router.get('/imports/list', verifyToken, async (req, res) => {
  try {
    const imports = await all(
      'SELECT * FROM contact_imports WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.partnerId]
    );
    res.json(imports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

/**
 * GET /api/contacts/tags/list
 */
router.get('/tags/list', verifyToken, async (req, res) => {
  try {
    const tags = await all(
      'SELECT name, color, contact_count FROM tags WHERE partner_id = $1 ORDER BY contact_count DESC',
      [req.partnerId]
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * POST /api/contacts/bulk/tag
 * Add tag to multiple contacts
 */
router.post('/bulk/tag', verifyToken, async (req, res) => {
  try {
    const { contact_ids, tag } = req.body;
    if (!contact_ids || !tag) return res.status(400).json({ error: 'contact_ids and tag required' });

    const tagName = tag.toLowerCase();
    await upsertTags(req.partnerId, [tagName]);

    await run(
      `UPDATE contacts SET tags = array_append(tags, $1)
       WHERE id = ANY($2::uuid[]) AND partner_id = $3
         AND NOT ($1 = ANY(tags))`,
      [tagName, contact_ids, req.partnerId]
    );

    res.json({ success: true, updated: contact_ids.length, tag: tagName });
  } catch (err) {
    res.status(500).json({ error: 'Bulk tag failed' });
  }
});

/**
 * POST /api/contacts/bulk/delete
 */
router.post('/bulk/delete', verifyToken, async (req, res) => {
  try {
    const { contact_ids } = req.body;
    if (!contact_ids || !contact_ids.length) return res.status(400).json({ error: 'contact_ids required' });

    const result = await run(
      'DELETE FROM contacts WHERE id = ANY($1::uuid[]) AND partner_id = $2 RETURNING id',
      [contact_ids, req.partnerId]
    );
    res.json({ success: true, deleted: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

/**
 * GET /api/contacts/stats/summary
 */
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const [totals, bySource, byTag] = await Promise.all([
      get(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN opted_out THEN 1 ELSE 0 END) as opted_out,
                SUM(CASE WHEN last_contacted_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as active_week
         FROM contacts WHERE partner_id = $1`,
        [req.partnerId]
      ),
      all(
        `SELECT source, COUNT(*) as count FROM contacts WHERE partner_id = $1 GROUP BY source ORDER BY count DESC`,
        [req.partnerId]
      ),
      all(
        `SELECT name, contact_count FROM tags WHERE partner_id = $1 ORDER BY contact_count DESC LIMIT 10`,
        [req.partnerId]
      ),
    ]);
    res.json({ totals, by_source: bySource, top_tags: byTag });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
