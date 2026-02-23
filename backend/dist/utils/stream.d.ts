/**
 * SSE (Server-Sent Events) Streaming Utilities
 * Helper functions for handling SSE streams
 */
import { Response } from 'express';
import { ChatResponse, ErrorType } from '../types';
/**
 * Sets up SSE headers for the Express response.
 * Pass requestOrigin (e.g. req.headers.origin) to allow multiple frontend origins.
 */
export declare function setupSSEHeaders(res: Response, requestOrigin?: string): void;
/**
 * Sends a data chunk to the client via SSE
 */
export declare function sendSSEData(res: Response, data: ChatResponse): void;
/**
 * Sends an error to the client via SSE
 */
export declare function sendSSEError(res: Response, error: string, type?: ErrorType): void;
/**
 * Sends the [DONE] marker to signal stream completion
 */
export declare function sendSSEDone(res: Response): void;
/**
 * Handles client disconnection cleanup
 */
export declare function handleClientDisconnect(res: Response, cleanup?: () => void): void;
//# sourceMappingURL=stream.d.ts.map