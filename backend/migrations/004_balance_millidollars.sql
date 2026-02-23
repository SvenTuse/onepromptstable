-- Migration: switch balance and transaction amounts from cents to millidollars
-- (1 unit = $0.001) so minimum charge can be $0.001. Scale: multiply by 10.
-- Existing: 100 cents = $1. After: 1000 units = $1. Display: balance_cents / 1000 = USD.
-- Run once. From backend: node run-solana-migration.js ./migrations/004_balance_millidollars.sql

UPDATE balances
SET balance_cents = balance_cents * 10,
    locked_cents = locked_cents * 10;

UPDATE transactions
SET amount_cents = amount_cents * 10,
    balance_before_cents = balance_before_cents * 10,
    balance_after_cents = balance_after_cents * 10;

-- api_usage.cost_cents stores charge amount; scale to millidollars
UPDATE api_usage
SET cost_cents = cost_cents * 10
WHERE cost_cents > 0;
