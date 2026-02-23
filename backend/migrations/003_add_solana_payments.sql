-- Migration: Add Solana transactions table
-- Description: Creates table to track Solana USDC payment transactions

-- Create solana_transactions table
CREATE TABLE IF NOT EXISTS solana_transactions (
    id BIGSERIAL PRIMARY KEY,
    signature VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_usdc NUMERIC(20, 6) NOT NULL,
    from_address VARCHAR(44) NOT NULL,
    to_address VARCHAR(44) NOT NULL,
    purpose VARCHAR(100) DEFAULT 'llm_payment',
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_solana_transactions_user_id 
    ON solana_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_solana_transactions_signature 
    ON solana_transactions(signature);

CREATE INDEX IF NOT EXISTS idx_solana_transactions_created_at 
    ON solana_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solana_transactions_verified_at 
    ON solana_transactions(verified_at) 
    WHERE verified_at IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_solana_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solana_transactions_updated_at
    BEFORE UPDATE ON solana_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_solana_transactions_updated_at();

-- Add wallet_address column to users table (optional, for storing primary Solana wallet)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS solana_wallet_address VARCHAR(44),
    ADD COLUMN IF NOT EXISTS solana_wallet_connected_at TIMESTAMP;

-- Create index on wallet address
CREATE INDEX IF NOT EXISTS idx_users_solana_wallet 
    ON users(solana_wallet_address) 
    WHERE solana_wallet_address IS NOT NULL;

-- Add comment
COMMENT ON TABLE solana_transactions IS 'Tracks Solana USDC payment transactions for LLM usage';
COMMENT ON COLUMN solana_transactions.signature IS 'Solana transaction signature (unique identifier)';
COMMENT ON COLUMN solana_transactions.amount_usdc IS 'Amount in USDC (6 decimals precision)';
COMMENT ON COLUMN solana_transactions.from_address IS 'Sender Solana wallet address';
COMMENT ON COLUMN solana_transactions.to_address IS 'Recipient Solana wallet address (treasury)';
COMMENT ON COLUMN solana_transactions.purpose IS 'Purpose of payment (llm_payment, deposit, etc)';
COMMENT ON COLUMN solana_transactions.verified_at IS 'Timestamp when transaction was verified on-chain';
