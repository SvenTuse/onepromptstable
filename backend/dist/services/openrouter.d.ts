/**
 * OpenRouter API Service
 * Handles communication with OpenRouter API for streaming chat completions
 */
/** OpenRouter free variant — no credits required (0$/M tokens) */
export declare const FREE_MODEL = "google/gemini-2.5-flash-lite";
interface StreamOptions {
    /** Single message (for backward compatibility) */
    message?: string;
    /** Full conversation history (preferred when available) */
    messages?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    /** Model ID (e.g. DEFAULT_MODEL or FREE_MODEL). Defaults to DEFAULT_MODEL. */
    model?: string;
    onChunk: (content: string) => void;
    onComplete: (usage: {
        prompt_tokens: number;
        completion_tokens: number;
    }) => void | Promise<void>;
    onError: (error: Error) => void;
}
export declare function streamChatCompletion(options: StreamOptions): Promise<void>;
export {};
//# sourceMappingURL=openrouter.d.ts.map