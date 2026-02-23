/**
 * Run chat history migration (003_add_chat_history.sql).
 * Uses CHAT_DATABASE_URL if set, otherwise DATABASE_URL (same DB).
 * From backend folder: node run-chat-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString =
  process.env.CHAT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set CHAT_DATABASE_URL or DATABASE_URL in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl:
    connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
});

const sqlPath = path.join(__dirname, 'migrations', '003_add_chat_history.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool
  .query(sql)
  .then(() => {
    console.log('✅ Chat history migration completed');
    console.log('   - chat_sessions, chat_messages tables and indexes');
    pool.end();
  })
  .catch((err) => {
    console.error('❌ Chat history migration failed:', err);
    process.exit(1);
  });
