# Testing Checklist

## Prerequisites

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Add API Keys to backend/.env**
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   ```

3. **Ensure Database has Test User with Balance**
   - User should exist in `users` table
   - User should have entry in `balances` table with some balance_cents

---

## Task 1: Real Balance Display

### ✓ Test 1.1: Balance Fetches on Login
- [ ] Start frontend and backend
- [ ] Open browser dev tools (Network tab)
- [ ] Login to application
- [ ] Verify `GET /api/balance` request is made
- [ ] Check response contains `balance_usd` field
- [ ] Verify balance displayed in header/profile matches database value

### ✓ Test 1.2: Balance Shows $0 When Logged Out
- [ ] Logout from application
- [ ] Verify balance is not displayed or shows placeholder
- [ ] Should NOT show hardcoded $5.00

### ✓ Test 1.3: Balance Refreshes After Chat
- [ ] Login and select "Simple" mode
- [ ] Send a chat message
- [ ] After response completes, check Network tab
- [ ] Verify new `GET /api/balance` request is made
- [ ] Verify balance decreased by expected amount

---

## Task 2: Paid Chat Modes

### ✓ Test 2.1: Simple Mode - Basic Flow
- [ ] Login to application
- [ ] Click `+` button in chat input
- [ ] Verify "Simple" mode appears with Zap icon
- [ ] Select "Simple" mode
- [ ] Type a message (e.g., "Hello, how are you?")
- [ ] Verify cost estimate updates in real-time as you type
- [ ] Check estimated cost shows ~$0.021 for short message
- [ ] Click send button
- [ ] Verify message streams from Anthropic API
- [ ] Verify no errors in console
- [ ] Check balance decreased after completion

**Expected Pricing:**
- 10 words = $0.021 + $0.00003 = $0.02103 → 2 cents
- 50 words = $0.021 + $0.00015 = $0.02115 → 3 cents
- 100 words = $0.021 + $0.0003 = $0.0213 → 3 cents

### ✓ Test 2.2: MAX Mode - Basic Flow
- [ ] Select "MAX" mode from dropdown
- [ ] Type a message
- [ ] Verify cost estimate shows ~$2.34 minimum
- [ ] Send message
- [ ] Verify message streams from OpenAI API (or single response if streaming unsupported)
- [ ] Verify balance decreased significantly (~$2.34+)
- [ ] Check transaction history in database

**Expected Pricing:**
- 10 words = $2.34 + $0.0015 = $2.3415 → 235 cents
- 50 words = $2.34 + $0.0075 = $2.3475 → 235 cents
- 100 words = $2.34 + $0.015 = $2.355 → 236 cents

### ✓ Test 2.3: Free Mode Still Works
- [ ] Select "Free" mode (default)
- [ ] Send a message
- [ ] Verify streams from OpenRouter
- [ ] Verify NO charge applied
- [ ] Verify balance stays the same

### ✓ Test 2.4: Insufficient Balance Error
1. **Setup**: Create test user with low balance (e.g., 1 cent)
   ```sql
   UPDATE balances SET balance_cents = 1 WHERE user_id = 'test-user-id';
   ```

2. **Test Simple Mode**
   - [ ] Login as test user
   - [ ] Select "Simple" mode
   - [ ] Type message
   - [ ] Verify send button is DISABLED
   - [ ] Verify warning shows "Insufficient balance"
   - [ ] Try to send anyway (should fail)
   - [ ] Check Network tab - should show 402 error

3. **Test MAX Mode**
   - [ ] Select "MAX" mode
   - [ ] Verify send button is DISABLED immediately
   - [ ] Verify warning shows "Insufficient balance"

### ✓ Test 2.5: Cost Estimate Updates in Real-Time
- [ ] Select "Simple" mode
- [ ] Type slowly and watch the cost estimate
- [ ] Verify it updates as you type
- [ ] Add 10 more words, verify cost increases by ~$0.00003
- [ ] Clear input, verify cost resets to $0.021

### ✓ Test 2.6: Mode Selector UI
- [ ] Click `+` button
- [ ] Verify dropdown shows all modes:
  - Free (MessageSquare icon)
  - Simple (Zap icon) ← NEW
  - MAX (Sparkles icon) ← NEW
  - Reasoning (Brain icon)
  - Data Analytics (BarChart3 icon)
  - Photo (Image icon)
  - Video (Video icon)
  - Deep Research (Search icon)
- [ ] Select each mode and verify icon changes
- [ ] Verify selected mode is highlighted

### ✓ Test 2.7: Transaction Logging
After sending a Simple or MAX mode message:

1. **Check transactions table**
   ```sql
   SELECT * FROM transactions 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - [ ] Verify new transaction exists
   - [ ] Verify `type = 'usage'`
   - [ ] Verify `amount_cents` is negative (charge)
   - [ ] Verify `description` contains mode name
   - [ ] Verify `metadata` contains:
     - `mode`: "simple" or "max"
     - `promptWordCount`: number
     - `model`: model name
     - `input_tokens`, `output_tokens`, `total_tokens`

2. **Check api_usage table**
   ```sql
   SELECT * FROM api_usage 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - [ ] Verify new usage record exists
   - [ ] Verify `model` matches expected model
   - [ ] Verify `tokens_used` > 0
   - [ ] Verify `cost_cents` matches charge amount
   - [ ] Verify `request_metadata` contains mode info

### ✓ Test 2.8: Error Handling

**Test Anthropic API Error:**
- [ ] Set invalid `ANTHROPIC_API_KEY` in .env
- [ ] Restart backend
- [ ] Try Simple mode
- [ ] Verify error message displays: "Invalid Anthropic API key"
- [ ] Verify NO charge applied

**Test OpenAI API Error:**
- [ ] Set invalid `OPENAI_API_KEY` in .env
- [ ] Restart backend
- [ ] Try MAX mode
- [ ] Verify error message displays: "Invalid OpenAI API key"
- [ ] Verify NO charge applied

**Test Stream Interruption:**
- [ ] Start a Simple mode request
- [ ] Immediately close the browser tab (or click Stop button if available)
- [ ] Check database - verify NO charge applied
- [ ] Check balance - should be unchanged

---

## Database Verification Queries

### Check Current Balance
```sql
SELECT 
  u.email,
  b.balance_cents,
  b.balance_cents / 100.0 as balance_usd,
  b.locked_cents,
  b.version
FROM users u
JOIN balances b ON u.id = b.user_id
WHERE u.email = 'your-email@example.com';
```

### Check Recent Transactions
```sql
SELECT 
  t.created_at,
  t.type,
  t.amount_cents / 100.0 as amount_usd,
  t.description,
  t.metadata->>'mode' as mode,
  t.metadata->>'promptWordCount' as word_count,
  t.balance_after_cents / 100.0 as balance_after_usd
FROM transactions t
WHERE t.user_id = (SELECT id FROM users WHERE email = 'your-email@example.com')
ORDER BY t.created_at DESC
LIMIT 10;
```

### Check API Usage Stats
```sql
SELECT 
  au.created_at,
  au.model,
  au.tokens_used,
  au.cost_cents / 100.0 as cost_usd,
  au.request_metadata->>'mode' as mode,
  au.request_metadata->>'promptWordCount' as word_count
FROM api_usage au
WHERE au.user_id = (SELECT id FROM users WHERE email = 'your-email@example.com')
ORDER BY au.created_at DESC
LIMIT 10;
```

---

## Expected Console Output

### Backend Console (Successful Simple Mode Request)
```
2026-02-03T... - POST /api/chat
💬 Streaming chat completion (Anthropic - Simple mode)
✓ Stream completed successfully
✓ Charged user: 3 cents
✓ Transaction ID: xxx-xxx-xxx
```

### Frontend Console (Balance Fetch)
```
Fetching balance...
Balance fetched: $10.50
```

### Browser Network Tab
```
POST /api/chat
  Status: 200 OK
  Response: [SSE stream with data: events]
  
GET /api/balance
  Status: 200 OK
  Response: { "balance_usd": 10.47, ... }
```

---

## Common Issues & Solutions

### Issue: "ANTHROPIC_API_KEY is required"
**Solution:** Add the API key to `backend/.env` file and restart backend server

### Issue: "Invalid API key"
**Solution:** Verify API key is correct and active, check for extra spaces

### Issue: Balance doesn't refresh after chat
**Solution:** Check browser console for errors, verify `GET /api/balance` is called

### Issue: Send button stays disabled
**Solution:** Check balance is sufficient for selected mode, check console for errors

### Issue: Streaming doesn't work (o1-pro)
**Solution:** This is expected behavior - o1-pro may not support streaming, fallback to non-streaming is automatic

### Issue: "Insufficient balance" but balance shows enough
**Solution:** 
- Refresh page to get latest balance
- Check for locked_cents in database
- Verify calculation: balance_cents >= charge_cents

---

## Performance Benchmarks

### Simple Mode
- **Response time:** ~2-5 seconds for short prompts
- **Cost per request:** ~$0.02-0.05 for typical messages
- **Tokens:** ~1000-2000 output tokens

### MAX Mode
- **Response time:** ~10-30 seconds (heavy reasoning)
- **Cost per request:** ~$2.34-2.50 for typical messages
- **Tokens:** Up to 4000 output tokens

### Free Mode
- **Response time:** ~3-8 seconds
- **Cost:** $0 (free tier)
- **Tokens:** Varies by OpenRouter free model
