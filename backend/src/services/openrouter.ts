/**
 * OpenRouter API Service
 * Handles communication with OpenRouter API for streaming chat completions
 */

import axios, { AxiosError } from 'axios';

const BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';
/** OpenRouter free variant — no credits required (0$/M tokens) */
export const FREE_MODEL = 'google/gemini-2.5-flash-lite';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 10000;
const TIMEOUT_MS = 120000;

interface StreamOptions {
  /** Single message (for backward compatibility) */
  message?: string;
  /** Full conversation history (preferred when available) */
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  /** Model ID (e.g. DEFAULT_MODEL or FREE_MODEL). Defaults to DEFAULT_MODEL. */
  model?: string;
  onChunk: (content: string) => void;
  onComplete: (usage: { prompt_tokens: number; completion_tokens: number }) => void | Promise<void>;
  onError: (error: Error) => void;
}

export async function streamChatCompletion(options: StreamOptions): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  // Build messages array: use provided messages or fall back to single message
  let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  if (options.messages && options.messages.length > 0) {
    messages = options.messages;
  } else if (options.message) {
    messages = [
      {
        role: 'user' as const,
        content: options.message,
      },
    ];
  } else {
    throw new Error('Either message or messages must be provided');
  }

  const model = options.model ?? DEFAULT_MODEL;
  const requestBody = {
    model,
    messages,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    stream: true,
  };

  try {
    const response = await axios.post(`${BASE_URL}/chat/completions`, requestBody, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'LLM Router',
      },
      responseType: 'stream',
      timeout: TIMEOUT_MS,
    });

    const stream = response.data as NodeJS.ReadableStream;
    let buffer = '';
    let usage: { prompt_tokens: number; completion_tokens: number } = {
      prompt_tokens: 0,
      completion_tokens: 0,
    };
    let onCompleteCalled = false;
    const callOnCompleteOnce = () => {
      if (onCompleteCalled) return;
      onCompleteCalled = true;
      options.onComplete(usage);
    };

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          callOnCompleteOnce();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            options.onChunk(content);
          }
          if (parsed.usage) {
            usage = parsed.usage;
          }
        } catch {
          // ignore malformed
        }
      }
    });

    stream.on('end', () => {
      callOnCompleteOnce();
    });

    stream.on('error', (err: Error) => {
      options.onError(err);
    });
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const statusText = axiosError.response.statusText;

      if (status === 429) {
        options.onError(new Error('Rate limit exceeded. Please try again later.'));
      } else if (status === 401) {
        options.onError(new Error('Invalid API key. Please check your OPENROUTER_API_KEY.'));
      } else if (status === 402) {
        options.onError(new Error('OpenRouter account has no credits or negative balance. Add credits at openrouter.ai or use a free model.'));
      } else if (status === 400) {
        options.onError(new Error(`Invalid request: ${statusText}`));
      } else {
        options.onError(new Error(`OpenRouter API error: ${status} ${statusText}`));
      }
    } else if (axiosError.code === 'ECONNABORTED') {
      options.onError(new Error('Request timeout. The response took too long.'));
    } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
      options.onError(new Error('Network error. Could not connect to OpenRouter API.'));
    } else {
      options.onError(new Error(`Network error: ${axiosError.message}`));
    }
  }
}
