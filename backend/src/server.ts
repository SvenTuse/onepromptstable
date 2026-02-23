/**
 * Local server entry: loads env, checks DB, starts Express.
 * For Vercel, the serverless entry is app.ts (default export).
 */

import dotenv from 'dotenv';
import pool from './config/database';
import { closeChatDb } from './config/chat-database';

dotenv.config();

process.on('SIGTERM', async () => {
  await Promise.all([pool.end(), closeChatDb()]);
  process.exit(0);
});

const PORT = process.env.PORT || 3001;

pool
  .query('SELECT NOW()')
  .then(async () => {
    const { default: app } = await import('./app');
    app.listen(PORT);
  })
  .catch((err: unknown) => {
    console.error('❌ Failed to connect to database:', err);
    console.error('Check your DATABASE_URL in .env file');
    process.exit(1);
  });
