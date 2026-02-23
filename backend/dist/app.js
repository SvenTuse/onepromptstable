"use strict";
/**
 * Express application (used by server.ts for local run and by Vercel serverless).
 * Export default for Vercel; server.ts imports and calls app.listen() for local dev.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // no-op on Vercel (env set by platform); loads .env locally
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = __importDefault(require("./config/database"));
const chat_1 = __importDefault(require("./routes/chat"));
const chat_history_routes_1 = __importDefault(require("./routes/chat-history.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const balance_routes_1 = __importDefault(require("./routes/balance.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
/** Comma-separated list of allowed origins (e.g. production frontend + localhost for tests). */
const getAllowedOrigins = () => {
    const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
};
const allowedOrigins = getAllowedOrigins();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
            return;
        }
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['X-Chat-Session-Id'],
}));
app.use(express_1.default.json());
// Mount chat-history first so /api/chat/sessions is matched; then POST /api/chat for streaming
app.use('/api/chat', chat_history_routes_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/balance', balance_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
app.get('/health', async (_req, res) => {
    try {
        await database_1.default.query('SELECT 1');
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    const status = err?.status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
});
exports.default = app;
//# sourceMappingURL=app.js.map