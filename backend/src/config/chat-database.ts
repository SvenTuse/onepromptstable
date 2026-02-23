/**
 * Chat history database configuration.
 * Uses a separate connection pool so chat history can use a different
 * database/schema (e.g. same Neon project, different database) or the same URL.
 * If CHAT_DATABASE_URL is not set, the app runs without chat history persistence.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.CHAT_DATABASE_URL;
const sslDisabled =
  process.env.CHAT_DATABASE_SSL === 'false' || process.env.CHAT_DATABASE_SSL === '0';
const useSSL =
  !!connectionString &&
  !sslDisabled &&
  (connectionString.includes('neon.tech') || connectionString.includes('sslmode=require'));

let pool: Pool | null = null;

function getChatPool(): Pool | null {
  if (!connectionString || typeof connectionString !== 'string') {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[Chat DB] Pool error:', err.message);
    });
  }
  return pool;
}

/** Returns true if chat history database is configured and available. */
export function isChatDatabaseConfigured(): boolean {
  return !!connectionString && typeof connectionString === 'string';
}

/**
 * Get the chat database pool. Returns null if CHAT_DATABASE_URL is not set.
 * Use this for all chat history operations; check for null and skip writes if unavailable.
 */
export function getChatDb(): Pool | null {
  return getChatPool();
}

/**
 * Close the chat database pool (e.g. on SIGTERM).
 * Safe to call even if pool was never created.
 */
export async function closeChatDb(): Promise<void> {
  if (pool) {
    await pool.end().catch((err) => console.error('[Chat DB] Error closing pool:', err));
    pool = null;
  }
}
