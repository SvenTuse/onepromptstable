# LLM Router Backend

Backend server for LLM request router with real-time streaming support via Server-Sent Events (SSE).

## Features

- ✅ Express.js server with TypeScript
- ✅ Real-time streaming via SSE (Server-Sent Events)
- ✅ OpenRouter API integration
- ✅ Robust error handling
- ✅ CORS configuration
- ✅ Environment-based configuration
- ✅ Production-ready code structure

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key ([Get one here](https://openrouter.ai/))

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Production Build

1. Build TypeScript:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## API Endpoints

### POST `/api/chat`

Streams chat completion from OpenRouter API.

**Request Body:**
```json
{
  "message": "Your prompt here",
  "temperature": 0.7,      // Optional, default: 0.7
  "maxTokens": 10000       // Optional, default: 10000
}
```

**Response:**
Server-Sent Events (SSE) stream with content chunks:
```
data: {"content":"Hello"}
data: {"content":" world"}
data: [DONE]
```

**Error Response:**
```
data: {"error":"Error message","type":"error_type"}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "uptime": 123.456
}
```

## Project Structure

```
backend/
├── src/
│   ├── server.ts          # Main Express server
│   ├── routes/
│   │   └── chat.ts        # Chat endpoint with streaming logic
│   ├── services/
│   │   └── openrouter.ts  # OpenRouter API integration
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   └── utils/
│       └── stream.ts      # SSE streaming utilities
├── .env                   # Environment variables (not in git)
├── .env.example           # Example environment file
├── package.json
├── tsconfig.json
└── README.md
```

## Chat History (optional)

To persist chat sessions and messages, set `CHAT_DATABASE_URL` in `.env` (can be the same Neon instance, different database/schema, or a separate instance). If unset, chat works without history.

Run the chat history migration (from `backend` folder):

```bash
node run-chat-migration.js
```

This uses `CHAT_DATABASE_URL` if set, otherwise `DATABASE_URL`. It creates `chat_sessions` and `chat_messages` tables.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key (required) | - |
| `PORT` | Server port | 3001 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `CHAT_DATABASE_URL` | Chat history DB (optional; same or separate Neon) | - |

## Error Types

- `network_error`: Network/connection issues
- `rate_limit`: Rate limiting from API
- `invalid_request`: Invalid request parameters
- `server_error`: Internal server errors

## Testing

### Manual Testing

1. Start the server: `npm run dev`
2. Test with curl:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?"}' \
  --no-buffer
```

3. Test health endpoint:
```bash
curl http://localhost:3001/health
```

### Testing Scenarios

1. **Basic streaming**: Send a prompt and verify text appears incrementally
2. **Long responses**: Test with maxTokens=10000 to ensure no truncation
3. **Error scenarios**: Invalid API key, network failure, rate limiting
4. **Connection stability**: Interrupt connection mid-stream
5. **Concurrent requests**: Multiple simultaneous streams

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If you see `Error: listen EADDRINUSE: address already in use :::3001`:

**Option 1: Kill the process using port 3001**

**PowerShell (Recommended):**
```powershell
# Run PowerShell as Administrator, then:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

**Or use the provided script:**
```powershell
.\kill-port.ps1
```

**Command Prompt:**
```cmd
# Find the process ID
netstat -ano | findstr :3001

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**Option 2: Use a different port**

Update `.env` file:
```
PORT=3002
```

Then update frontend API URL to match (if needed).

### Server won't start
- Check that `PORT` is not already in use (see above)
- Verify `.env` file exists and contains `OPENROUTER_API_KEY`
- Make sure you've run `npm install` in the backend directory

### Streaming not working
- Verify `OPENROUTER_API_KEY` is valid
- Check network connectivity to OpenRouter API
- Review server logs for error messages
- Ensure backend is running on the correct port

### CORS errors
- Ensure `FRONTEND_URL` in `.env` matches your frontend URL
- Check that CORS middleware is properly configured
- Verify frontend is making requests to the correct backend URL

## License

ISC
