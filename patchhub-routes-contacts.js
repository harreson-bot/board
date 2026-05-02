const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const { run, get, all } = require('../database');
const { verifyToken } = require('./auth');

// Get all contacts for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const contacts = await all(
      'SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Upload CSV and enrich contacts
router.post('/upload-csv', verifyToken, async (req, res) => {
  try {
    const { filename, data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const importId = uuidv4();
    let matchedCount = 0;

    // Parse CSV data
    for (const row of data) {
      const contactId = uuidv4();
      const firstName = row['First Name'] || row['first_name'] || '';
      const lastName = row['Last Name'] || row['last_name'] || '';
      const email = row['Email'] || row['email'] || '';
      const phone = row['Phone'] || row['phone'] || '';
      const company = row['Company'] || row['company'] || '';

      if (!email && !phone) continue; // Skip empty rows

      try {
        // Enrich with Generect API (simulated for now)
        const enrichedData = await enrichContact(email, firstName, lastName);

        await run(
          `INSERT INTO contacts 
           (id, user_id, first_name, last_name, email, phone, company, social_profiles, enriched)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contactId,
            req.userId,
            firstName,
            lastName,
            email,
            phone,
            company,
            JSON.stringify(enrichedData.profiles),
            1
          ]
        );

        matchedCount++;
      } catch (error) {
        console.error(`Error enriching contact ${email}:`, error);
        // Still add contact even if enrichment fails
        await run(
          `INSERT INTO contacts 
           (id, user_id, first_name, last_name, email, phone, company, enriched)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contactId,
            req.userId,
            firstName,
            lastName,
            email,
            phone,
            company,
            0
          ]
        );
      }
    }

    // Log import
    await run(
      `INSERT INTO contact_imports (id, user_id, filename, total_count, matched_count)
       VALUES (?, ?, ?, ?, ?)`,
      [importId, req.userId, filename, data.length, matchedCount]
    );

    res.json({
      success: true,
      importId,
      totalCount: data.length,
      matchedCount,
      message: `${matchedCount} out of ${data.length} contacts enriched successfully`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload contacts' });
  }
});

// Enrich contact with social profiles (simulated)
async function enrichContact(email, firstName, lastName) {
  // In production, this would call Generect API
  // For now, return mock data

  const socialProfiles = [];

  // Simulate finding social profiles
  if (email) {
    const emailName = email.split('@')[0];

    // Mock Instagram
    if (Math.random() > 0.3) {
      socialProfiles.push({
        platform: 'instagram',
        username: emailName,
        url: `https://instagram.com/${emailName}`,
        verified: false
      });
    }

    // Mock LinkedIn
    if (Math.random() > 0.4) {
      const linkedinName = `${firstName}-${lastName}`.toLowerCase();
      socialProfiles.push({
        platform: 'linkedin',
        username: linkedinName,
        url: `https://linkedin.com/in/${linkedinName}`,
        verified: false
      });
    }

    // Mock Facebook
    if (Math.random() > 0.5) {
      socialProfiles.push({
        platform: 'facebook',
        username: `${firstName}${lastName}`.toLowerCase(),
        url: `https://facebook.com/${firstName}${lastName}`,
        verified: false
      });
    }
  }

  return { profiles: socialProfiles };
}

// Get contact details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const contact = await get(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Parse social profiles JSON
    contact.social_profiles = contact.social_profiles ? JSON.parse(contact.social_profiles) : [];

    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Delete contact
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const contact = await get(
      'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await run('DELETE FROM contacts WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Get import history
router.get('/imports/history', verifyToken, async (req, res) => {
  try {
    const imports = await all(
      'SELECT * FROM contact_imports WHERE user_id = ? ORDER BY import_date DESC',
      [req.userId]
    );
    res.json(imports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
});

module.exports = router;
