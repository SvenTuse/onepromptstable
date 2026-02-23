"use strict";
/**
 * Chat history service.
 * Uses a separate connection pool (chat DB). All writes are non-blocking and
 * must not affect the main chat flow if the chat DB is unavailable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryService = void 0;
const uuid_1 = require("uuid");
const chat_database_1 = require("../config/chat-database");
const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 100;
function getPool() {
    return (0, chat_database_1.getChatDb)();
}
/**
 * Run a write operation with retries (exponential backoff). Never throws to caller.
 * Use for all insert/update/delete so main flow is never blocked.
 */
function fireAndForget(fn, label) {
    let attempt = 0;
    const run = () => {
        fn()
            .catch((err) => {
            console.error(`[ChatHistory] ${label} failed (attempt ${attempt + 1}):`, err?.message ?? err);
            attempt++;
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
                setTimeout(run, delay);
            }
        });
    };
    run();
}
/** Throws if chat DB is not available (for read/update flows that need it). */
function requirePool() {
    const pool = getPool();
    if (!pool) {
        throw new Error('Chat history database is not configured');
    }
    return pool;
}
class ChatHistoryService {
    /**
     * Create a new chat session. Returns session id or null if DB unavailable.
     * When used from routes, handle null and continue without history.
     */
    static async createSession(userId, title, model) {
        const pool = getPool();
        if (!pool)
            return null;
        const id = (0, uuid_1.v4)();
        await pool.query(`INSERT INTO chat_sessions (id, user_id, title, model) VALUES ($1, $2, $3, $4)`, [id, userId, title ?? null, model ?? null]);
        return this.getSession(id, userId);
    }
    static async getSession(sessionId, userId) {
        const pool = getPool();
        if (!pool)
            return null;
        const result = await pool.query(`SELECT id, user_id, title, model, created_at, updated_at, last_message_at, message_count, is_archived, metadata
       FROM chat_sessions
       WHERE id = $1 AND user_id = $2 AND (is_archived = false OR is_archived IS NOT true)`, [sessionId, userId]);
        if (result.rows.length === 0)
            return null;
        return result.rows[0];
    }
    static async getUserSessions(userId, limit = DEFAULT_PAGE_SIZE, offset = 0) {
        const pool = getPool();
        if (!pool)
            return [];
        const result = await pool.query(`SELECT id, user_id, title, model, created_at, updated_at, last_message_at, message_count, is_archived, metadata
       FROM chat_sessions
       WHERE user_id = $1 AND (is_archived = false OR is_archived IS NOT true)
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return result.rows;
    }
    static async updateSession(sessionId, userId, data) {
        const pool = getPool();
        if (!pool)
            return null;
        const updates = [];
        const values = [];
        let i = 1;
        if (data.title !== undefined) {
            updates.push(`title = $${i++}`);
            values.push(data.title);
        }
        if (data.model !== undefined) {
            updates.push(`model = $${i++}`);
            values.push(data.model);
        }
        if (data.metadata !== undefined) {
            updates.push(`metadata = $${i++}`);
            values.push(JSON.stringify(data.metadata));
        }
        if (data.is_archived !== undefined) {
            updates.push(`is_archived = $${i++}`);
            values.push(data.is_archived);
        }
        if (updates.length === 0)
            return this.getSession(sessionId, userId);
        values.push(sessionId, userId);
        await pool.query(`UPDATE chat_sessions SET ${updates.join(', ')} WHERE id = $${i} AND user_id = $${i + 1}`, values);
        return this.getSession(sessionId, userId);
    }
    static async deleteSession(sessionId, userId, archiveOnly = true) {
        const pool = getPool();
        if (!pool)
            return false;
        if (archiveOnly) {
            const r = await pool.query('UPDATE chat_sessions SET is_archived = true WHERE id = $1 AND user_id = $2', [sessionId, userId]);
            return (r.rowCount ?? 0) > 0;
        }
        const r = await pool.query('DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2', [
            sessionId,
            userId,
        ]);
        return (r.rowCount ?? 0) > 0;
    }
    /**
     * Save a message. Non-blocking: use fireAndForget when called from chat stream.
     * When called from API (e.g. sync response), can await.
     */
    static saveMessage(sessionId, userId, role, content, metadata) {
        fireAndForget(async () => {
            const pool = requirePool();
            await pool.query(`INSERT INTO chat_messages (session_id, user_id, role, content, model, tokens_used, cost_cents, temperature, max_tokens, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                sessionId,
                userId,
                role,
                content,
                metadata?.model ?? null,
                metadata?.tokens_used ?? null,
                metadata?.cost_cents ?? null,
                metadata?.temperature ?? null,
                metadata?.max_tokens ?? null,
                metadata ? JSON.stringify(metadata) : null,
            ]);
        }, 'saveMessage');
    }
    /** Awaitable version for routes that need to confirm write (e.g. returning message id). */
    static async saveMessageSync(sessionId, userId, role, content, metadata) {
        const pool = getPool();
        if (!pool)
            return null;
        const result = await pool.query(`INSERT INTO chat_messages (session_id, user_id, role, content, model, tokens_used, cost_cents, temperature, max_tokens, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, session_id, user_id, role, content, model, tokens_used, cost_cents, temperature, max_tokens, created_at, metadata`, [
            sessionId,
            userId,
            role,
            content,
            metadata?.model ?? null,
            metadata?.tokens_used ?? null,
            metadata?.cost_cents ?? null,
            metadata?.temperature ?? null,
            metadata?.max_tokens ?? null,
            metadata ? JSON.stringify(metadata) : null,
        ]);
        return result.rows[0] ?? null;
    }
    static async getSessionMessages(sessionId, userId, limit = DEFAULT_PAGE_SIZE, offset = 0) {
        const pool = getPool();
        if (!pool)
            return [];
        const session = await this.getSession(sessionId, userId);
        if (!session)
            return [];
        const result = await pool.query(`SELECT id, session_id, user_id, role, content, model, tokens_used, cost_cents, temperature, max_tokens, created_at, metadata
       FROM chat_messages
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at ASC
       LIMIT $3 OFFSET $4`, [sessionId, userId, limit, offset]);
        return result.rows;
    }
    /**
     * Get recent messages for context (e.g. for continuing conversation).
     * Stops adding messages when total content length would exceed roughly maxTokens (approx 4 chars per token).
     */
    static async getSessionContext(sessionId, userId, maxTokens = 32000) {
        const pool = getPool();
        if (!pool)
            return [];
        const session = await this.getSession(sessionId, userId);
        if (!session)
            return [];
        const result = await pool.query(`SELECT role, content
       FROM chat_messages
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at ASC`, [sessionId, userId]);
        const rows = result.rows;
        const approxChars = maxTokens * 4;
        let total = 0;
        const out = [];
        for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i];
            total += (r.content?.length ?? 0);
            if (total > approxChars)
                break;
            out.unshift({
                role: r.role,
                content: r.content ?? '',
            });
        }
        return out;
    }
    /**
     * Update session message_count and last_message_at. Non-blocking.
     */
    static updateSessionStats(sessionId) {
        fireAndForget(async () => {
            const pool = requirePool();
            await pool.query(`UPDATE chat_sessions s
         SET message_count = (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id),
             last_message_at = (SELECT MAX(created_at) FROM chat_messages WHERE session_id = s.id)
         WHERE s.id = $1`, [sessionId]);
        }, 'updateSessionStats');
    }
}
exports.ChatHistoryService = ChatHistoryService;
//# sourceMappingURL=chat-history.service.js.map