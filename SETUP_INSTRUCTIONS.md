# Setup Instructions for Balance Display & Paid Chat Modes

## Quick Start (5 minutes)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

This will install the new packages:
- `@anthropic-ai/sdk` (for Simple mode)
- `openai` (for MAX mode)

### 2. Add API Keys to Backend Environment
Edit `backend/.env` and add these lines:

```env
# Anthropic API Key (for Simple mode)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI API Key (for MAX mode)  
OPENAI_API_KEY=sk-proj-...
```

**Where to get API keys:**
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 4. Verify Everything Works

1. Open http://localhost:5173
2. Login with your account
3. **Check balance displays** (should show real value from database, not $5.00)
4. Click the `+` button in chat input
5. You should see:
   - ✓ Free (existing)
   - ✓ Simple (NEW - Zap icon)
   - ✓ MAX (NEW - Sparkles icon)
   - Other modes...

6. Select "Simple" mode and send a test message
7. Verify the response streams and balance decreases

Done! 🎉

---

## Detailed Setup Guide

### Prerequisites

Before starting, ensure you have:

✓ Node.js 18+ installed
✓ PostgreSQL database (Neon) with existing schema
✓ Backend and frontend already set up and working
✓ Test user account with some balance in database

### Step-by-Step Installation

#### 1. Backend Dependencies

The new packages are already added to `package.json`:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "openai": "^4.77.0"
  }
}
```

Install them:

```bash
cd backend
npm install
```

#### 2. Environment Configuration

**File:** `backend/.env`

Add these new environment variables:

```env
# Existing variables...
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# NEW: Add these lines
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**Important Notes:**
- Keep your existing `OPENROUTER_API_KEY` - it's still used for free mode
- Don't commit the `.env` file to git (already in `.gitignore`)
- The `.env.example` file has been updated with placeholders

#### 3. Database Setup

**No migrations needed!** ✓

The existing schema already supports the new features:
- `transactions` table has `metadata` JSONB column (stores mode info)
- `api_usage` table has `request_metadata` JSONB column (stores mode info)
- `balances` table is unchanged

#### 4. Verify Database State

Check that test user has balance:

```sql
SELECT 
  u.email,
  b.balance_cents / 100.0 as balance_usd
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
WHERE u.email = 'your-test-email@example.com';
```

If balance is `NULL` or user has no balance entry, create one:

```sql
INSERT INTO balances (user_id, balance_cents, locked_cents, currency, version)
VALUES (
  (SELECT id FROM users WHERE email = 'your-test-email@example.com'),
  1000,  -- $10.00
  0,
  'USD',
  1
)
ON CONFLICT (user_id) DO NOTHING;
```

#### 5. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
💾 Database: Connected to Neon PostgreSQL
🚀 Server running on http://localhost:3001
📊 Frontend URL: http://localhost:5173
```

**Frontend:**
```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### 6. Test the Features

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for comprehensive testing guide.

Quick verification:

1. **Balance Display:**
   - Login → Check balance in header
   - Open DevTools Network tab
   - Verify `GET /api/balance` request succeeded

2. **Simple Mode:**
   - Select "Simple" mode
   - Type "Hello" (5 words)
   - Verify cost shows ~$0.021
   - Send message
   - Verify response streams
   - Verify balance decreased by 2-3 cents

3. **MAX Mode:**
   - Select "MAX" mode
   - Type "Explain quantum physics"
   - Verify cost shows ~$2.34
   - Send message
   - Verify response (may be non-streaming)
   - Verify balance decreased by ~235 cents

---

## Troubleshooting

### Problem: npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Problem: "ANTHROPIC_API_KEY is required"

**Cause:** API key not set in `.env` file

**Solution:**
1. Open `backend/.env`
2. Add line: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart backend server

### Problem: "Invalid API key" error

**Cause:** API key is incorrect or expired

**Solution:**
1. Go to https://console.anthropic.com/settings/keys
2. Generate new API key
3. Replace in `.env` file
4. Restart backend

### Problem: Balance still shows $5.00

**Cause:** Frontend not fetching from API, or no balance in database

**Solution:**

1. Check browser console for errors
2. Check Network tab - should see `GET /api/balance` request
3. If request is missing, clear browser cache and reload
4. If request returns error, check backend logs
5. Verify user has balance entry in database:
   ```sql
   SELECT * FROM balances WHERE user_id = 'xxx';
   ```

### Problem: Send button always disabled for paid modes

**Cause:** Balance too low or balance not loading

**Solution:**

1. Check browser console for balance fetch errors
2. Verify balance in database:
   ```sql
   SELECT balance_cents FROM balances WHERE user_id = 'xxx';
   ```
3. If balance is 0 or low, add test balance:
   ```sql
   UPDATE balances 
   SET balance_cents = 10000  -- $100.00
   WHERE user_id = 'xxx';
   ```

### Problem: Stream errors or timeouts

**Cause:** API rate limits or network issues

**Solution:**

1. Check API dashboard for rate limits:
   - Anthropic: https://console.anthropic.com/settings/limits
   - OpenAI: https://platform.openai.com/account/limits

2. Check backend logs for detailed error messages

3. Try free mode to verify server is working

4. If using free tier APIs, you may hit rate limits quickly

### Problem: o1-pro not streaming

**Cause:** This is expected behavior - o1-pro may not support streaming

**Solution:** No action needed - the code automatically falls back to non-streaming mode

### Problem: Balance not refreshing after chat

**Cause:** JavaScript error in frontend

**Solution:**

1. Check browser console for errors
2. Clear browser cache
3. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
4. Check that `refreshBalance()` is being called in `Index.tsx`

---

## Configuration Options

### Adjusting Pricing

To change pricing for modes, edit:

**Backend:** `backend/src/utils/pricing.ts`

```typescript
if (mode === 'simple') {
  const total = 0.021 + groups * 0.00003;  // Change these values
  return Math.round(total * 100);
}
```

**Frontend:** `src/lib/pricing.ts`

```typescript
'simple': {
  // ... 
  fixedFee: 0.021,  // Change this
  // ...
}
```

Make sure to keep backend and frontend in sync!

### Changing Models

**Anthropic model:**

Edit `backend/src/services/anthropic.service.ts`:

```typescript
const MODEL = 'claude-sonnet-4-20250514';  // Change model ID
const MAX_TOKENS = 1300;  // Adjust token limit
```

**OpenAI model:**

Edit `backend/src/services/openai.service.ts`:

```typescript
const MODEL = 'o1-pro';  // Change model ID
const MAX_TOKENS = 4000;  // Adjust token limit
```

### Disabling Modes

To temporarily disable a mode without removing code:

**Frontend:** `src/contexts/ChatContext.tsx`

```typescript
// Add mode to blocked list
if (mode !== 'default' && mode !== 'simple' && mode !== 'max') {
  setInputNotice('This mode is temporarily unavailable');
  return false;
}
```

---

## API Key Management

### Getting API Keys

**Anthropic (for Simple mode):**
1. Sign up at https://console.anthropic.com/
2. Go to Settings → API Keys
3. Click "Create Key"
4. Copy key (starts with `sk-ant-`)

**OpenAI (for MAX mode):**
1. Sign up at https://platform.openai.com/
2. Go to API Keys section
3. Click "Create new secret key"
4. Copy key (starts with `sk-proj-` or `sk-`)

### API Key Security

✓ **DO:**
- Store keys in `.env` file (never commit)
- Use environment variables in code
- Rotate keys periodically
- Monitor usage on API dashboards

✗ **DON'T:**
- Commit keys to git
- Share keys in messages/screenshots
- Hardcode keys in source files
- Use same key across multiple projects

### API Rate Limits

**Anthropic:**
- Free tier: Limited requests per month
- Paid tier: Based on tier (check dashboard)

**OpenAI:**
- Free tier: Very limited (often just testing)
- Paid tier: Based on usage tier
- o1-pro: Usually requires paid tier

**Monitoring:**
- Anthropic: https://console.anthropic.com/settings/limits
- OpenAI: https://platform.openai.com/account/limits

---

## Production Deployment

When deploying to production:

### 1. Environment Variables

Set these on your hosting platform (Vercel, Railway, etc.):

```env
# Backend
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://yourdomain.com
```

### 2. CORS Configuration

Update `backend/src/server.ts`:

```typescript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,  // Will use production URL
    credentials: true,
    exposedHeaders: ['X-Chat-Session-Id'],
  })
);
```

### 3. Security Checklist

- [ ] All API keys in environment variables
- [ ] JWT secrets are strong random strings (32+ chars)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] CORS origin set to production domain
- [ ] Rate limiting enabled (consider adding)
- [ ] Error messages don't expose sensitive info

### 4. Performance Optimization

- [ ] Enable database connection pooling (already done via pg Pool)
- [ ] Add CDN for frontend static assets
- [ ] Enable gzip compression on server
- [ ] Monitor API usage to avoid unexpected costs
- [ ] Consider caching balance requests (with TTL)

---

## Support & Resources

### Documentation
- Implementation Summary: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- Testing Checklist: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

### API Documentation
- Anthropic API: https://docs.anthropic.com/claude/reference/
- OpenAI API: https://platform.openai.com/docs/api-reference
- OpenRouter API: https://openrouter.ai/docs

### Community
- Anthropic Discord: https://discord.gg/anthropic
- OpenAI Forum: https://community.openai.com/

---

## Next Steps

After successful setup:

1. ✓ Test all modes with small amounts
2. ✓ Monitor API costs in dashboards
3. ✓ Set up alerts for high usage
4. ✓ Add transaction history UI (optional)
5. ✓ Implement usage analytics (optional)
6. ✓ Add user-configurable mode defaults (optional)

---

**Need help?** Check the troubleshooting section or review the testing checklist.
