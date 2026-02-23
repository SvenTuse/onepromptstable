/**
 * Chat history service.
 * Uses a separate connection pool (chat DB). All writes are non-blocking and
 * must not affect the main chat flow if the chat DB is unavailable.
 */
export interface ChatSessionRow {
    id: string;
    user_id: string;
    title: string | null;
    model: string | null;
    created_at: Date;
    updated_at: Date;
    last_message_at: Date | null;
    message_count: number;
    is_archived: boolean;
    metadata: Record<string, unknown> | null;
}
export interface ChatMessageRow {
    id: string;
    session_id: string;
    user_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model: string | null;
    tokens_used: number | null;
    cost_cents: number | null;
    temperature: number | null;
    max_tokens: number | null;
    created_at: Date;
    metadata: Record<string, unknown> | null;
}
export declare class ChatHistoryService {
    /**
     * Create a new chat session. Returns session id or null if DB unavailable.
     * When used from routes, handle null and continue without history.
     */
    static createSession(userId: string, title?: string | null, model?: string | null): Promise<ChatSessionRow | null>;
    static getSession(sessionId: string, userId: string): Promise<ChatSessionRow | null>;
    static getUserSessions(userId: string, limit?: number, offset?: number): Promise<ChatSessionRow[]>;
    static updateSession(sessionId: string, userId: string, data: {
        title?: string;
        model?: string;
        metadata?: Record<string, unknown>;
        is_archived?: boolean;
    }): Promise<ChatSessionRow | null>;
    static deleteSession(sessionId: string, userId: string, archiveOnly?: boolean): Promise<boolean>;
    /**
     * Save a message. Non-blocking: use fireAndForget when called from chat stream.
     * When called from API (e.g. sync response), can await.
     */
    static saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: {
        model?: string;
        tokens_used?: number;
        cost_cents?: number;
        temperature?: number;
        max_tokens?: number;
        [key: string]: unknown;
    } | null): void;
    /** Awaitable version for routes that need to confirm write (e.g. returning message id). */
    static saveMessageSync(sessionId: string, userId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, unknown> | null): Promise<ChatMessageRow | null>;
    static getSessionMessages(sessionId: string, userId: string, limit?: number, offset?: number): Promise<ChatMessageRow[]>;
    /**
     * Get recent messages for context (e.g. for continuing conversation).
     * Stops adding messages when total content length would exceed roughly maxTokens (approx 4 chars per token).
     */
    static getSessionContext(sessionId: string, userId: string, maxTokens?: number): Promise<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[]>;
    /**
     * Update session message_count and last_message_at. Non-blocking.
     */
    static updateSessionStats(sessionId: string): void;
}
//# sourceMappingURL=chat-history.service.d.ts.map