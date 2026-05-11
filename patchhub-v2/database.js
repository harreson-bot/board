/**
 * PatchHub v2 - SQLite Database Layer (Multi-tenant)
 * Partner isolation via partner_id on every query
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'patchhub.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log(`✅ Connected to SQLite database at ${dbPath}`);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Query helpers
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('DB error:', { sql: sql.substring(0, 100), err: err.message });
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('DB error:', { sql: sql.substring(0, 100), err: err.message });
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('DB error:', { sql: sql.substring(0, 100), err: err.message });
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
};

/**
 * Initialize SQLite schema - idempotent (safe to run multiple times)
 */
const initializeSchema = async () => {
  try {
    // Partners table
    await run(`
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        company TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contacts table
    await run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        name TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        title TEXT,
        notes TEXT,
        tags TEXT,
        engagement_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      )
    `);

    // Contact imports table
    await run(`
      CREATE TABLE IF NOT EXISTS contact_imports (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        filename TEXT,
        file_type TEXT,
        total_count INTEGER,
        imported_count INTEGER,
        duplicate_count INTEGER,
        error_count INTEGER,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      )
    `);

    // DM Drafts table
    await run(`
      CREATE TABLE IF NOT EXISTS dm_drafts (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        platform TEXT,
        variables TEXT,
        status TEXT DEFAULT 'draft',
        queue_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      )
    `);

    // DM Queue table (per-contact queue items)
    await run(`
      CREATE TABLE IF NOT EXISTS dm_queue (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        draft_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        personalized_body TEXT,
        platform TEXT,
        status TEXT DEFAULT 'pending',
        sent_at DATETIME,
        opened_at DATETIME,
        clicked_at DATETIME,
        replied_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
        FOREIGN KEY (draft_id) REFERENCES dm_drafts(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Engagement logs table
    await run(`
      CREATE TABLE IF NOT EXISTS engagement_logs (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        event_type TEXT,
        platform TEXT,
        description TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      )
    `);

    // Social integrations table
    await run(`
      CREATE TABLE IF NOT EXISTS social_integrations (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        is_connected BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(partner_id, platform),
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      )
    `);

    // Tags table
    await run(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(partner_id, name),
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      )
    `);

    // Indexes for performance
    await run('CREATE INDEX IF NOT EXISTS idx_contacts_partner_id ON contacts(partner_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)');
    await run('CREATE INDEX IF NOT EXISTS idx_dm_drafts_partner_id ON dm_drafts(partner_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_dm_queue_draft_id ON dm_queue(draft_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_engagement_logs_partner_id ON engagement_logs(partner_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_engagement_logs_contact_id ON engagement_logs(contact_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_tags_partner_id ON tags(partner_id)');

    console.log('✅ Database schema initialized successfully');
  } catch (err) {
    console.error('Schema initialization error:', err);
    throw err;
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initializeSchema
};
