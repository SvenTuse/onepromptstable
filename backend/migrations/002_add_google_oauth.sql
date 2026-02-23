-- Добавление полей для Google OAuth в таблицу users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS picture VARCHAR(500);

-- Сделать password_hash необязательным для Google OAuth
ALTER TABLE users 
  ALTER COLUMN password_hash DROP NOT NULL;

-- Индекс для google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Обновить существующих пользователей (установить provider)
UPDATE users SET provider = 'email' WHERE provider IS NULL;

-- Комментарии
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.provider IS 'Authentication provider: email, google, etc.';
COMMENT ON COLUMN users.picture IS 'User profile picture URL';
