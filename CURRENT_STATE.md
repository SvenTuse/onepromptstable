# Current State

Single source of truth for active features, API, DB, and dependencies (as of cleanup).

## Active Features

- **Auth**: Email/password register & login, Google OAuth, JWT access/refresh, logout
- **Balance**: Real balance from DB, welcome bonus, charge on paid chat, deposit (admin), transaction history
- **Chat**: Free (OpenRouter), Simple (Claude Sonnet 4.5), MAX (o1-pro), Data Analytics, Code, Deep Research modes; streaming SSE; session/message persistence when `CHAT_DATABASE_URL` is set
- **Payments**: Solana USDC top-up (verify on-chain → credit balance), balance-based charges for paid modes

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh` | No | Refresh tokens |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/google` | No | Google OAuth |
| GET | `/api/balance` | Yes | Balance |
| POST | `/api/balance/deposit` | Admin | Manual deposit |
| GET | `/api/balance/transactions` | Yes | Transaction history |
| GET | `/api/balance/usage-stats` | Yes | Usage stats |
| POST | `/api/chat` | Yes | Streaming chat (mode in body) |
| GET | `/api/chat/sessions` | Yes | List sessions |
| POST | `/api/chat/sessions` | Yes | Create session |
| GET | `/api/chat/sessions/:id` | Yes | Get session |
| PUT | `/api/chat/sessions/:id` | Yes | Update session |
| DELETE | `/api/chat/sessions/:id` | Yes | Delete/archive session |
| GET | `/api/chat/sessions/:id/messages` | Yes | Messages |
| GET | `/api/chat/sessions/:id/context` | Yes | Context for continuation |
| GET | `/api/payment/solana/config` | No | Solana config |
| GET | `/api/payment/solana/health` | No | Solana RPC health |
| GET | `/api/payment/solana/balance/:address` | No | Wallet USDC/SOL |
| POST | `/api/payment/solana/estimate` | Yes | Estimate cost |
| POST | `/api/payment/solana/verify` | Yes | Verify tx, credit balance |
| GET | `/api/payment/solana/transactions` | Yes | User Solana tx history |
| GET | `/health` | No | Health check |

## Database (main – `DATABASE_URL`)

- **users**: id, email, password_hash, username, full_name, role, is_active, email_verified, google_id, provider, picture, created_at, updated_at, last_login_at
- **refresh_tokens**: id, user_id, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address
- **balances**: id, user_id, balance_cents, currency, locked_cents, version, created_at, updated_at
- **transactions**: id, user_id, type, amount_cents, balance_before/after_cents, currency, status, description, metadata, idempotency_key, created_at, completed_at
- **api_usage**: id, user_id, transaction_id, model, tokens_used, cost_cents, request_metadata, created_at
- **solana_transactions**: id, signature, user_id, amount_usdc, from_address, to_address, purpose, verified_at, created_at

Stored procedure: `process_transaction()` for atomic balance updates.

## Chat DB (optional – `CHAT_DATABASE_URL`)

- **chat_sessions**: id, user_id, title, model, created_at, updated_at, last_message_at, message_count, is_archived, metadata
- **chat_messages**: id, session_id, user_id, role, content, model, tokens_used, cost_cents, temperature, max_tokens, created_at, metadata

If unset, chat works without history; session/message endpoints return 503.

## Migrations

- `001_initial_schema.sql` – users, refresh_tokens, balances, transactions, api_usage, process_transaction
- `002_add_google_oauth.sql` – Google OAuth columns on users
- `003_add_chat_history.sql` – chat_sessions, chat_messages (use with run-chat-migration.js when using CHAT_DATABASE_URL)
- `003_add_solana_payments.sql` – solana_transactions

Apply via: `node run-migration.js`, `node run-google-migration.js`, `node run-chat-migration.js`, `node run-solana-migration.js` (or Prisma migrate if configured).

## Key Dependencies

**Backend:** express, cors, dotenv, pg, bcrypt, jsonwebtoken, uuid, google-auth-library, @solana/web3.js, @solana/spl-token, axios (OpenRouter/APIs). Prisma used for migrations only (schema in prisma/schema.prisma).

**Frontend:** react, react-router-dom, @solana/wallet-adapter-*, @solana/web3.js, @react-oauth/google, sonner, tailwind, shadcn/ui, vite.

## Env (see .env.example / backend/.env.example)

- **Backend:** DATABASE_URL, CHAT_DATABASE_URL (optional), JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID/SECRET, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, PORT, FRONTEND_URL, SOLANA_RPC_ENDPOINT, SOLANA_WS_ENDPOINT
- **Frontend:** VITE_API_URL, VITE_GOOGLE_CLIENT_ID, VITE_SOLANA_RPC_ENDPOINT, VITE_SOLANA_WS_ENDPOINT
