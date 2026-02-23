import { Pool } from 'pg';
import dotenv from 'dotenv';

// Загружаем .env до чтения переменных (импорт database может быть раньше dotenv.config() в server.ts)
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString || typeof connectionString !== 'string') {
  throw new Error(
    'DATABASE_URL is not set. Add DATABASE_URL to backend/.env (see .env.example).'
  );
}
// Явное отключение SSL (для локального PostgreSQL или если сервер не поддерживает SSL)
const sslDisabled = process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0';
// Включаем SSL для Neon или когда в URL указан sslmode=require (если не отключено вручную)
const useSSL =
  !sslDisabled &&
  (connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require'));

const pool = new Pool({
  connectionString,
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;

