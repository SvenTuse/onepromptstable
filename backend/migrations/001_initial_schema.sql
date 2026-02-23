-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Индексы для users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Таблица refresh токенов
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(500),
    ip_address INET
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Таблица балансов (с строгим контролем целостности)
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    locked_cents BIGINT NOT NULL DEFAULT 0 CHECK (locked_cents >= 0),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT balance_integrity CHECK (balance_cents >= locked_cents)
);

CREATE INDEX idx_balances_user_id ON balances(user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balances_updated_at
    BEFORE UPDATE ON balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Таблица транзакций (СТРОГИЙ LEDGER)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'usage', 'refund', 'bonus')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents != 0),
    balance_before_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    description TEXT,
    metadata JSONB,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT balance_calculation_check CHECK (
        balance_after_cents = balance_before_cents + amount_cents
    )
);

-- Индексы для transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);

-- Таблица истории использования API
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL CHECK (tokens_used > 0),
    cost_cents BIGINT NOT NULL CHECK (cost_cents >= 0),
    request_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_transaction_id ON api_usage(transaction_id);

-- Функция для создания баланса при регистрации
CREATE OR REPLACE FUNCTION create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO balances (user_id, balance_cents)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_balance
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_balance();

-- Функция для атомарной транзакции с ledger
CREATE OR REPLACE FUNCTION process_transaction(
    p_user_id UUID,
    p_type VARCHAR,
    p_amount_cents BIGINT,
    p_description TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_balance_before BIGINT;
    v_balance_after BIGINT;
    v_transaction_id UUID;
    v_balance_version INTEGER;
BEGIN
    -- Блокировка строки баланса для обновления
    SELECT balance_cents, version INTO v_balance_before, v_balance_version
    FROM balances
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User balance not found for user_id: %', p_user_id;
    END IF;

    -- Проверка идемпотентности
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_transaction_id
        FROM transactions
        WHERE idempotency_key = p_idempotency_key;
        
        IF FOUND THEN
            RETURN v_transaction_id;
        END IF;
    END IF;

    -- Вычисление нового баланса
    v_balance_after := v_balance_before + p_amount_cents;

    -- Проверка на отрицательный баланс
    IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', 
            ABS(p_amount_cents), v_balance_before;
    END IF;

    -- Создание записи транзакции
    INSERT INTO transactions (
        user_id, 
        type, 
        amount_cents, 
        balance_before_cents, 
        balance_after_cents,
        description,
        metadata,
        idempotency_key,
        status,
        completed_at
    ) VALUES (
        p_user_id,
        p_type,
        p_amount_cents,
        v_balance_before,
        v_balance_after,
        p_description,
        p_metadata,
        p_idempotency_key,
        'completed',
        NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Обновление баланса с optimistic locking
    UPDATE balances
    SET 
        balance_cents = v_balance_after,
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND version = v_balance_version;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Concurrent modification detected. Please retry.';
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Вью для статистики пользователей
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.created_at,
    b.balance_cents,
    b.currency,
    COUNT(DISTINCT t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'usage' THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_spent_cents,
    COUNT(DISTINCT a.id) as total_api_calls
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
LEFT JOIN transactions t ON u.id = t.user_id
LEFT JOIN api_usage a ON u.id = a.user_id
GROUP BY u.id, u.email, u.username, u.created_at, b.balance_cents, b.currency;

COMMENT ON TABLE users IS 'Основная таблица пользователей системы';
COMMENT ON TABLE balances IS 'Балансы пользователей с защитой от race conditions';
COMMENT ON TABLE transactions IS 'Строгий ledger всех финансовых транзакций';
COMMENT ON TABLE api_usage IS 'История использования API для биллинга';
COMMENT ON FUNCTION process_transaction IS 'Атомарная обработка транзакции с гарантией целостности';