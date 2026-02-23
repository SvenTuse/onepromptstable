const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const sslDisabled = process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0';
const connectionString = process.env.DATABASE_URL;
const useSSL = !sslDisabled && (
  connectionString?.includes('neon.tech') || 
  connectionString?.includes('sslmode=require')
);

const pool = new Pool({
  connectionString,
  ...(useSSL && {
    ssl: { rejectUnauthorized: false }
  })
});

const sql = fs.readFileSync('./migrations/002_add_google_oauth.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Google OAuth migration completed successfully!');
    console.log('   - Added columns: google_id, provider, picture');
    console.log('   - Made password_hash optional');
    console.log('   - Added google_id index');
    pool.end();
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    pool.end();
    process.exit(1);
  });
