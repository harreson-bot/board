/**
 * Migration: Add Compliance & Reputation Tracking Tables
 * Run: node scripts/add-compliance-tables.js
 */

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./patchhub.db');

const migrations = [
  // Add columns to partners table
  `ALTER TABLE partners ADD COLUMN reputation_score INTEGER DEFAULT 100`,
  `ALTER TABLE partners ADD COLUMN bounce_rate REAL DEFAULT 0`,
  `ALTER TABLE partners ADD COLUMN complaint_rate REAL DEFAULT 0`,

  // Add consent_status to contacts
  `ALTER TABLE contacts ADD COLUMN consent_status TEXT DEFAULT 'unconfirmed'`,

  // Send logs (track every outgoing message)
  `CREATE TABLE IF NOT EXISTS send_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id TEXT NOT NULL,
    contact_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    message_id TEXT UNIQUE,
    status TEXT DEFAULT 'sent', -- sent, delivered, failed, bounced
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
  )`,

  // Bounce logs (track bounced emails)
  `CREATE TABLE IF NOT EXISTS bounce_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id TEXT NOT NULL,
    email TEXT NOT NULL,
    bounce_type TEXT DEFAULT 'permanent', -- permanent, temporary, undetermined
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id)
  )`,

  // Complaint logs (spam reports)
  `CREATE TABLE IF NOT EXISTS complaint_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id TEXT NOT NULL,
    email TEXT NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id)
  )`,

  // Compliance audit logs
  `CREATE TABLE IF NOT EXISTS compliance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id TEXT NOT NULL,
    action TEXT NOT NULL, -- disabled, enabled, warning, rate-limited
    reason TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id)
  )`,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_send_logs_partner ON send_logs(partner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_send_logs_email ON send_logs(email)`,
  `CREATE INDEX IF NOT EXISTS idx_bounce_logs_partner ON bounce_logs(partner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_complaint_logs_partner ON complaint_logs(partner_id)`,
];

let completed = 0;

migrations.forEach((migration, index) => {
  db.run(migration, (err) => {
    if (err && err.message.includes('duplicate column')) {
      console.log(`⚠️  Migration ${index + 1}: Column already exists (safe)`);
    } else if (err && err.message.includes('already exists')) {
      console.log(`✅ Migration ${index + 1}: Table already exists (safe)`);
    } else if (err) {
      console.error(`❌ Migration ${index + 1} failed:`, err.message);
      process.exit(1);
    } else {
      console.log(`✅ Migration ${index + 1} completed`);
    }

    completed++;
    if (completed === migrations.length) {
      console.log('\n✅ All compliance tables created/updated successfully!');
      db.close();
    }
  });
});
