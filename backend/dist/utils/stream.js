"use strict";
/**
 * SSE (Server-Sent Events) Streaming Utilities
 * Helper functions for handling SSE streams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSSEHeaders = setupSSEHeaders;
exports.sendSSEData = sendSSEData;
exports.sendSSEError = sendSSEError;
exports.sendSSEDone = sendSSEDone;
exports.handleClientDisconnect = handleClientDisconnect;
/** Allowed origins (comma-separated FRONTEND_URL) for SSE CORS. */
function getAllowedOrigins() {
    const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
/**
 * Sets up SSE headers for the Express response.
 * Pass requestOrigin (e.g. req.headers.origin) to allow multiple frontend origins.
 */
function setupSSEHeaders(res, requestOrigin) {
    const allowed = getAllowedOrigins();
    const origin = requestOrigin && allowed.includes(requestOrigin)
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
function sendSSEData(res, data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
}
/**
 * Sends an error to the client via SSE
 */
function sendSSEError(res, error, type = 'server_error') {
    sendSSEData(res, { error, type });
}
/**
 * Sends the [DONE] marker to signal stream completion
 */
function sendSSEDone(res) {
    res.write('data: [DONE]\n\n');
    res.end();
}
/**
 * Handles client disconnection cleanup
 */
function handleClientDisconnect(res, cleanup) {
    res.on('close', () => {
        if (cleanup) {
            cleanup();
        }
        if (!res.headersSent) {
            res.end();
        }
    });
}
//# sourceMappingURL=stream.js.map