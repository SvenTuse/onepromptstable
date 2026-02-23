/**
 * Chat history database configuration.
 * Uses a separate connection pool so chat history can use a different
 * database/schema (e.g. same Neon project, different database) or the same URL.
 * If CHAT_DATABASE_URL is not set, the app runs without chat history persistence.
 */
import { Pool } from 'pg';
/** Returns true if chat history database is configured and available. */
export declare function isChatDatabaseConfigured(): boolean;
/**
 * Get the chat database pool. Returns null if CHAT_DATABASE_URL is not set.
 * Use this for all chat history operations; check for null and skip writes if unavailable.
 */
export declare function getChatDb(): Pool | null;
/**
 * Close the chat database pool (e.g. on SIGTERM).
 * Safe to call even if pool was never created.
 */
export declare function closeChatDb(): Promise<void>;
//# sourceMappingURL=chat-database.d.ts.map