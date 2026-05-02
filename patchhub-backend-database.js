const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'patchhub.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize schema
const initializeSchema = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        company TEXT,
        plan TEXT DEFAULT 'individual',
        api_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contacts table
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        social_profiles TEXT,
        enriched BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Contact imports (for tracking CSV uploads)
    db.run(`
      CREATE TABLE IF NOT EXISTS contact_imports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT,
        total_count INTEGER,
        matched_count INTEGER,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Campaigns
    db.run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        template TEXT,
        status TEXT DEFAULT 'draft',
        total_recipients INTEGER,
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        replied_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        launched_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Campaign messages (sent DMs)
    db.run(`
      CREATE TABLE IF NOT EXISTS campaign_messages (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        message_body TEXT,
        sent_at DATETIME,
        opened_at DATETIME,
        clicked_at DATETIME,
        replied_at DATETIME,
        reply_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )
    `);

    // API logs
    db.run(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT,
        method TEXT,
        status_code INTEGER,
        response_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('✅ Database schema initialized');
  });
};

// Run queries
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

initializeSchema();

module.exports = {
  db,
  run,
  get,
  all
};
