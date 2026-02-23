/**
 * API client for backend. Chat history endpoints and chat stream.
 */

import type { ChatSession, ChatMessage, ChatContextMessage } from '@/types/chat';

const getDefaultBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

export interface ListSessionsOptions {
  limit?: number;
  offset?: number;
}

export interface ListMessagesOptions {
  limit?: number;
  offset?: number;
}

export interface CreateSessionBody {
  title?: string;
  model?: string;
}

export interface UpdateSessionBody {
  title?: string;
  model?: string;
  metadata?: Record<string, unknown>;
  is_archived?: boolean;
}

/** Fetch user's chat sessions (for sidebar). */
export async function fetchSessions(
  accessToken: string | null,
  options: ListSessionsOptions = {},
  baseUrl: string = getDefaultBaseUrl()
): Promise<{ sessions: ChatSession[] }> {
  const { limit = 50, offset = 0 } = options;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${baseUrl}/api/chat/sessions?${params}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch sessions');
  }
  return res.json();
}

/** Create a new chat session. */
export async function createSession(
  accessToken: string | null,
  body: CreateSessionBody = {},
  baseUrl: string = getDefaultBaseUrl()
): Promise<ChatSession> {
  const res = await fetch(`${baseUrl}/api/chat/sessions`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create session');
  }
  return res.json();
}

/** Get a single session by id. */
export async function fetchSession(
  sessionId: string,
  accessToken: string | null,
  baseUrl: string = getDefaultBaseUrl()
): Promise<ChatSession> {
  const res = await fetch(`${baseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Session not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch session');
  }
  return res.json();
}

/** Update session (title, etc.). */
export async function updateSession(
  sessionId: string,
  accessToken: string | null,
  body: UpdateSessionBody,
  baseUrl: string = getDefaultBaseUrl()
): Promise<ChatSession> {
  const res = await fetch(`${baseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Session not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update session');
  }
  return res.json();
}

/** Delete or archive session. permanent=true for hard delete. */
export async function deleteSession(
  sessionId: string,
  accessToken: string | null,
  permanent: boolean = false,
  baseUrl: string = getDefaultBaseUrl()
): Promise<{ deleted: boolean; archived: boolean }> {
  const params = permanent ? '?permanent=true' : '';
  const res = await fetch(
    `${baseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}${params}`,
    { method: 'DELETE', headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('Session not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete session');
  }
  return res.json();
}

/** Get messages for a session. */
export async function fetchSessionMessages(
  sessionId: string,
  accessToken: string | null,
  options: ListMessagesOptions = {},
  baseUrl: string = getDefaultBaseUrl()
): Promise<{ messages: ChatMessage[] }> {
  const { limit = 50, offset = 0 } = options;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(
    `${baseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages?${params}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('Session not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch messages');
  }
  return res.json();
}

/** Get conversation context for a session (for continuing conversation). */
export async function fetchSessionContext(
  sessionId: string,
  accessToken: string | null,
  maxTokens: number = 32000,
  baseUrl: string = getDefaultBaseUrl()
): Promise<{ messages: ChatContextMessage[] }> {
  const params = new URLSearchParams({ max_tokens: String(maxTokens) });
  const res = await fetch(
    `${baseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}/context?${params}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('Session not found');
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch context');
  }
  return res.json();
}

/** Fetch user's balance. */
export async function fetchBalance(
  accessToken: string | null,
  baseUrl: string = getDefaultBaseUrl()
): Promise<{ balance_usd: number; balance_cents: number; available_usd: number }> {
  const res = await fetch(`${baseUrl}/api/balance`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch balance');
  }
  return res.json();
}
