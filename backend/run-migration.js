const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('./migrations/001_initial_schema.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Migration completed successfully!');
    console.log('   - Created tables: users, balances, transactions, api_usage');
    console.log('   - Created triggers and functions');
    pool.end();
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });