# OnePrompt — AI Chat & LLM Router

Full-stack app: React (Vite) frontend + Express backend. Multi-mode AI chat
(Simple/MAX, Data Analytics, Code, Deep Research) with per-prompt pricing,
email + Google OAuth auth, balance top-ups, optional chat history, and
Solana (USDC) wallet connection via the x402 flow.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Solana wallet adapter (Phantom / Solflare)
- Express + PostgreSQL (backend)

## Getting started

Requires Node.js & npm.

```sh
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app runs on http://localhost:5173.

## Build

```sh
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

## Docs

- **Backend:** [backend/README.md](backend/README.md) — API, env, migrations.
- **Current state:** [CURRENT_STATE.md](CURRENT_STATE.md) — features, endpoints, DB, env.
- **Setup:** [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md), [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).
- **Deployment:** [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment

Copy `.env.example` to `.env` and fill in the values (see
[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)).
