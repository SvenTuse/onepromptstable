const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrationFile = process.argv[2] || './migrations/003_add_solana_payments.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Solana migration completed successfully!');
    console.log('   - Created table: solana_transactions');
    console.log('   - Added columns to users table');
    console.log('   - Created indexes and triggers');
    pool.end();
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
