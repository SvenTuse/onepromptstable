/**
 * Express application (used by server.ts for local run and by Vercel serverless).
 * Export default for Vercel; server.ts imports and calls app.listen() for local dev.
 */

import dotenv from 'dotenv';
dotenv.config(); // no-op on Vercel (env set by platform); loads .env locally

import express from 'express';
import cors from 'cors';
import pool from './config/database';

import chatRoutes from './routes/chat';
import chatHistoryRoutes from './routes/chat-history.routes';
import authRoutes from './routes/auth.routes';
import balanceRoutes from './routes/balance.routes';
import paymentRoutes from './routes/payment.routes';

/** Comma-separated list of allowed origins (e.g. production frontend + localhost for tests). */
const getAllowedOrigins = (): string[] => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const app = express();

app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['X-Chat-Session-Id'],
  })
);
app.use(express.json());

// Mount chat-history first so /api/chat/sessions is matched; then POST /api/chat for streaming
app.use('/api/chat', chatHistoryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    const status = (err as { status?: number })?.status ?? 500;
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
  }
);

export default app;
