/**
 * TypeScript interfaces and types for the LLM Router Backend
 */

export interface ChatRequest {
  message: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content?: string;
  error?: string;
  type?: ErrorType;
}

export type ErrorType = 
  | 'network_error' 
  | 'rate_limit' 
  | 'invalid_request' 
  | 'server_error';

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

export interface OpenRouterStreamChunk {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    delta?: {
      content?: string;
      role?: string;
    };
    finish_reason?: string | null;
  }>;
}
