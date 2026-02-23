/**
 * SSE (Server-Sent Events) Streaming Utilities
 * Helper functions for handling SSE streams
 */

import { Response } from 'express';
import { ChatResponse, ErrorType } from '../types';

/** Allowed origins (comma-separated FRONTEND_URL) for SSE CORS. */
function getAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Sets up SSE headers for the Express response.
 * Pass requestOrigin (e.g. req.headers.origin) to allow multiple frontend origins.
 */
export function setupSSEHeaders(res: Response, requestOrigin?: string): void {
  const allowed = getAllowedOrigins();
  const origin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] || '*';
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Sends a data chunk to the client via SSE
 */
export function sendSSEData(res: Response, data: ChatResponse): void {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  res.write(message);
}

/**
 * Sends an error to the client via SSE
 */
export function sendSSEError(
  res: Response,
  error: string,
  type: ErrorType = 'server_error'
): void {
  sendSSEData(res, { error, type });
}

/**
 * Sends the [DONE] marker to signal stream completion
 */
export function sendSSEDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * Handles client disconnection cleanup
 */
export function handleClientDisconnect(
  res: Response,
  cleanup?: () => void
): void {
  res.on('close', () => {
    if (cleanup) {
      cleanup();
    }
    if (!res.headersSent) {
      res.end();
    }
  });
}
