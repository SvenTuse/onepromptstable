# Implementation Summary: Balance Display & Paid Chat Modes

## Task 1: Display Real Balance from Database ✓

### Backend Changes
- **No changes needed** - Balance endpoint already exists at `GET /api/balance`
- Returns `balance_usd` field which is `balance_cents / 100`
- Protected by JWT auth middleware

### Frontend Changes

#### 1. Added Balance Fetch Function
**File:** `src/lib/api.ts`
- Added `fetchBalance(accessToken)` function
- Fetches balance from `GET /api/balance` endpoint
- Returns `{ balance_usd, balance_cents, available_usd }`

#### 2. Updated Index Page
**File:** `src/pages/Index.tsx`
- Removed hardcoded `balance = 5.00`
- Added `balanceLoading` state
- Created `refreshBalance()` callback that fetches balance from API
- Balance fetches on mount when user is authenticated
- Balance refreshes after successful chat completion
- Shows $0.00 when not logged in (not hardcoded $5.00)

---

## Task 2: Add Two Paid Chat Modes ✓

### Backend Changes

#### 1. Added NPM Dependencies
**File:** `backend/package.json`
- Added `"@anthropic-ai/sdk": "^0.32.0"`
- Added `"openai": "^4.77.0"`

**Installation command:**
```bash
cd backend
npm install
```

#### 2. Updated Environment Variables
**File:** `backend/.env.example`
```env
# Anthropic (for Simple mode - claude-sonnet-4-5)
ANTHROPIC_API_KEY=

# OpenAI (for MAX mode - o1-pro)
OPENAI_API_KEY=
```

**Note:** You need to add these keys to your actual `.env` file.

#### 3. Created Pricing Utility
**File:** `backend/src/utils/pricing.ts`
- `calculateChargeCents(mode, userMessage)` function
- Simple mode: $0.021 fixed + $0.00003 per 10 words
- MAX mode: $2.34 fixed + $0.0015 per 10 words
- Returns charge in cents

#### 4. Created Anthropic Service (Simple Mode)
**File:** `backend/src/services/anthropic.service.ts`
- Uses `@anthropic-ai/sdk` package
- Model: `claude-sonnet-4-20250514`
- Max tokens: 1300
- Streaming support with event callbacks
- Error handling for 401, 429, 400 status codes

#### 5. Created OpenAI Service (MAX Mode)
**File:** `backend/src/services/openai.service.ts`
- Uses `openai` package
- Model: `o1-pro`
- Max completion tokens: 4000
- Tries streaming first, falls back to non-streaming if unsupported
- Error handling for 401, 429, 400 status codes

#### 6. Updated Chat Route
**File:** `backend/src/routes/chat.ts`

**Changes:**
- Added support for `mode` field in request body: `"default"`, `"simple"`, `"max"`
- Pre-calculates charge for paid modes before streaming
- Checks balance before starting stream (returns 402 if insufficient)
- Routes to appropriate service based on mode:
  - `default` → OpenRouter (free)
  - `simple` → Anthropic service
  - `max` → OpenAI service
- Charges user after successful stream completion
- Uses unique `idempotencyKey` for each transaction
- Logs API usage with mode, word count, and token usage
- Does NOT charge if stream errors or client disconnects

### Frontend Changes

#### 1. Updated Pricing Configuration
**File:** `src/lib/pricing.ts`

**Changes:**
- Added `'simple'` and `'max'` to `GenerationMode` type
- Added model rates:
  - `claude-sonnet-4-5`: $3000/$15000 per 1M tokens
  - `o1-pro`: $150000/$600000 per 1M tokens
- Added mode pricing:
  - **Simple**: Label "Simple", icon "Zap", fixed $0.021
  - **MAX**: Label "MAX", icon "Sparkles", fixed $2.34
- Updated `calculatePrice()` function to handle word-based pricing for simple/max modes
- Shows real-time cost estimate as user types

#### 2. Updated Chat Context
**File:** `src/contexts/ChatContext.tsx`
- Allows `simple` and `max` modes for logged-in users
- Other modes still require payment method setup
- Sends selected mode in request body to backend

#### 3. Updated Mode Selector
**File:** `src/components/chat/ModeSelector.tsx`
- Added `Zap` icon import (for Simple mode)
- Added `Sparkles` icon import (for MAX mode)
- Modes now display in dropdown:
  - **Free** - Standard AI responses (free)
  - **Simple** - Fast reasoning with Claude Sonnet 4.5
  - **MAX** - Deep reasoning with o1-pro
  - (+ existing modes: Reasoning, Data Analytics, Photo, Video, Deep Research)

#### 4. Balance Refresh After Chat
**File:** `src/pages/Index.tsx`
- Wrapped `chat.sendMessage` to call `refreshBalance()` after successful completion
- Balance updates immediately after paid chat request

---

## How to Test

### 1. Setup Environment Variables
```bash
# In backend/.env, add:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
```

### 4. Start Frontend
```bash
npm run dev
```

### 5. Test Balance Display
1. Login to the application
2. Check that balance displays real value from database (not $5.00)
3. Check browser console - should see successful balance fetch

### 6. Test Simple Mode
1. Click the `+` button in chat input
2. Select "Simple" mode
3. Type a message and watch cost estimate update
4. Send message
5. Verify stream completes and balance decreases
6. Check balance updates automatically after response

### 7. Test MAX Mode
1. Select "MAX" mode from dropdown
2. Type a message (cost will be higher ~$2.34+)
3. Send message
4. Verify stream completes and balance decreases significantly

### 8. Test Insufficient Balance
1. Use a test account with low balance (< $0.03 for Simple)
2. Try to send a message in Simple or MAX mode
3. Should see error: "Insufficient balance"
4. Button should be disabled

---

## Architecture Notes

### Pricing Models

**Simple Mode (Anthropic)**
- Fixed charge: $0.021 (50% margin on $0.042 base)
- Variable: $0.00003 per 10 words
- Example: 100-word prompt = $0.021 + (10 × $0.00003) = $0.021 + $0.0003 = $0.0213

**MAX Mode (OpenAI)**
- Fixed charge: $2.34 (30% margin on $3.00 base)
- Variable: $0.0015 per 10 words
- Example: 100-word prompt = $2.34 + (10 × $0.0015) = $2.34 + $0.015 = $2.355

### Balance Flow
1. User selects paid mode (Simple or MAX)
2. Frontend calculates estimated cost in real-time
3. User sends message
4. Backend pre-calculates exact charge based on word count
5. Backend checks balance before streaming
6. If sufficient, stream begins
7. After successful stream completion, charge is applied via `BalanceService.charge()`
8. Transaction logged in `transactions` table
9. API usage logged in `api_usage` table
10. Frontend refetches balance to show updated amount

### Error Handling
- **Insufficient balance:** 402 error returned before stream starts
- **Stream error:** No charge applied
- **Client disconnect:** No charge applied
- **API errors:** Gracefully handled with error messages

---

## Files Modified/Created

### Backend
- ✓ `backend/package.json` - Added dependencies
- ✓ `backend/.env.example` - Added API key placeholders
- ✓ `backend/src/utils/pricing.ts` - **CREATED** pricing calculator
- ✓ `backend/src/services/anthropic.service.ts` - **CREATED** Anthropic streaming
- ✓ `backend/src/services/openai.service.ts` - **CREATED** OpenAI streaming
- ✓ `backend/src/routes/chat.ts` - Updated to support new modes

### Frontend
- ✓ `src/lib/api.ts` - Added fetchBalance function
- ✓ `src/lib/pricing.ts` - Added Simple/MAX modes and word-based pricing
- ✓ `src/pages/Index.tsx` - Real balance fetch and refresh logic
- ✓ `src/contexts/ChatContext.tsx` - Allow simple/max modes
- ✓ `src/components/chat/ModeSelector.tsx` - Added Zap/Sparkles icons

---

## Known Limitations

1. **OpenAI o1-pro streaming**: Falls back to non-streaming if API doesn't support streaming
2. **Balance refresh**: Only happens after successful chat completion (not on error)
3. **Mode selector**: Still shows disabled modes (Reasoning, Data Analytics, Photo, Video, Deep Research) that require payment method setup

---

## Next Steps (Optional Enhancements)

1. Add balance loading indicator in UI
2. Add transaction history view for users to see charges
3. Add ability to set default mode per user
4. Add cost preview before sending (confirmation modal for high-cost requests)
5. Add support for attachments in Simple/MAX modes
6. Add retry logic for failed API calls
7. Add rate limiting per user
8. Add usage analytics dashboard

---

## Security Notes

- All API keys stored in environment variables (not committed)
- Balance checks happen server-side (cannot be bypassed by client)
- JWT authentication required for all paid endpoints
- Idempotency keys prevent duplicate charges
- Stored procedure ensures atomic balance updates with optimistic locking

---

## Migration Notes

**No database migrations required** - all existing tables support the new functionality.

The `transactions` table already has a `metadata` JSONB column that stores:
- `mode`: "simple" or "max"
- `promptWordCount`: number of words in prompt
- `input_tokens`, `output_tokens`, `total_tokens`

The `api_usage` table stores the same metadata for analytics.
