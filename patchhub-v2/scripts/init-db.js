/**
 * PatchHub v2 - Database Initialization Script
 * Run once: node scripts/init-db.js
 * Safe to re-run (idempotent)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initializeSchema, db } = require('../database');

async function main() {
  console.log('🔧 Initializing PatchHub v2 database...');
  console.log(`   Path: ${process.env.DB_PATH || './patchhub.db'}`);

  try {
    await initializeSchema();
    console.log('\n✅ Database initialized successfully!\n');
    console.log('Next steps:');
    console.log('  npm start         — start the server');
    console.log('  npm run dev       — development mode with hot reload\n');
  } catch (err) {
    console.error('\n❌ Initialization failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
