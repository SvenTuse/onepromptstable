export interface ChatSession {
  id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
  is_archived?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number | null;
  cost_cents?: number | null;
  model?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ChatContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
