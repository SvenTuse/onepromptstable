/**
 * Chat session state shared between Sidebar and Chat Panel.
 * Ensures real-time sync: optimistic sidebar updates, streaming titles, single source of truth.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSolanaPayment } from './SolanaPaymentContext';
import { stopAllTypewriters, resetStopSignal } from '@/hooks/useTypewriter';
import { fetchSessions, fetchSessionMessages, deleteSession } from '@/lib/api';
import type { ChatSession } from '@/types/chat';
import type { ChatConversation } from '@/components/chat/ChatSidebar';
import type { Message } from '@/components/chat/ChatMessage';
import type { Attachment } from '@/components/chat/AttachmentChip';
import type { GenerationMode } from '@/lib/pricing';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function sessionToConversation(s: ChatSession): ChatConversation {
  return {
    id: s.id,
    name: s.title || 'New conversation',
    timestamp: new Date(s.updated_at || s.created_at),
    unread: false,
    preview: undefined,
  };
}

export interface ChatContextValue {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: Message[];
  isThinking: boolean;
  thinkingText: string;
  isGenerating: boolean;
  messagesLoading: boolean;
  sessionsLoading: boolean;
  inputNotice: string | null;
  setInputNotice: (v: string | null) => void;
  newChat: () => void;
  selectConversation: (id: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (
    content: string,
    mode: GenerationMode,
    attachments: Attachment[],
    cost: number
  ) => Promise<boolean>;
  stopGeneration: () => void;
  onTypingComplete: (messageId: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated } = useAuth();
  const { connected, isPaymentEnabled, initiatePayment, verifyPayment } = useSolanaPayment();
  const isLoggedIn = isAuthenticated;

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputNotice, setInputNotice] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingSessionTempIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      return;
    }
    setSessionsLoading(true);
    fetchSessions(accessToken)
      .then(({ sessions }) => setConversations(sessions.map(sessionToConversation)))
      .catch(() => setConversations([]))
      .finally(() => setSessionsLoading(false));
  }, [isLoggedIn, accessToken]);

  const newChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      if (!accessToken) return;
      // Don't fetch messages for optimistic pending ids; keep current messages
      if (id.startsWith('pending-')) {
        setMessagesLoading(false);
        return;
      }
      setMessages([]);
      setMessagesLoading(true);
      fetchSessionMessages(id, accessToken)
        .then(({ messages: msgs }) => {
          const filtered = msgs.filter((m) => m.role === 'user' || m.role === 'assistant');
          const deduped = filtered.filter((m, i) => {
            const prev = filtered[i - 1];
            return !prev || prev.role !== m.role || prev.content !== m.content;
          });
          setMessages(
            deduped.map((m) => {
              let content = m.content ?? '';
              content = content.replace(/\|+$/g, '').trimEnd();
              return {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content,
                timestamp: new Date(m.created_at),
                tokens: m.tokens_used ?? undefined,
                cost: m.cost_cents != null ? m.cost_cents / 1000 : undefined,
              };
            })
          );
        })
        .catch(() => setMessages([]))
        .finally(() => setMessagesLoading(false));
    },
    [accessToken]
  );

  const deleteSessionById = useCallback(
    (id: string) => {
      if (!accessToken) return;
      deleteSession(id, accessToken, false)
        .then(() => {
          if (activeConversationId === id) {
            setActiveConversationId(null);
            setMessages([]);
          }
          return fetchSessions(accessToken);
        })
        .then(({ sessions }) => setConversations(sessions.map(sessionToConversation)))
        .catch(() => {});
    },
    [accessToken, activeConversationId]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      mode: GenerationMode,
      _attachments: Attachment[],
      _cost: number
    ): Promise<boolean> => {
      if (!isLoggedIn) {
        setInputNotice(null);
        setIsThinking(true);
        setIsGenerating(true);
        resetStopSignal();
        thinkingTimeoutRef.current = setTimeout(() => {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).slice(2),
              role: 'assistant',
              content:
                'We are currently experiencing a heavy workload, log in to your account to receive prioritized processing.',
              timestamp: new Date(),
              isNew: true,
            },
          ]);
        }, 1500);
        return false;
      }

      // Allow simple and max modes if user is logged in
      // Other modes still require payment method setup
      if (mode !== 'default' && mode !== 'simple' && mode !== 'max' && mode !== 'data-analytics-simple' && mode !== 'data-analytics-max' && mode !== 'code-simple' && mode !== 'code-max' && mode !== 'deep-research-simple' && mode !== 'deep-research-max') {
        setInputNotice('Connect the payment method: card or x402 payment wallet to get the trial');
        return false;
      }

      setInputNotice(null);

      // Check if we should use Solana payment for paid modes
      const isPaidMode = mode !== 'default';
      const useSolanaPayment = isPaidMode && connected && isPaymentEnabled;

      // Handle Solana payment if applicable
      if (useSolanaPayment) {
        try {
          setIsThinking(true);
          
          // Estimate cost
          const estimatedTokens = Math.ceil(content.length / 4);
          // Map mode to model name for estimation
          let modelName = 'claude-sonnet-4';
          if (mode === 'simple' || mode.startsWith('reasoning')) {
            modelName = 'claude-sonnet-4';
          } else if (mode === 'max' || mode.includes('max')) {
            modelName = 'claude-opus-4';
          } else if (mode.startsWith('data-analytics')) {
            modelName = 'gemini-3-flash-preview';
          } else if (mode.startsWith('code')) {
            modelName = 'grok-code-fast-1';
          }
          
          const estimateResponse = await fetch(`${API_URL}/api/payment/solana/estimate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              model: modelName,
              estimatedTokens,
              mode: mode, // Pass the actual mode for accurate pricing
              message: content, // Pass message for word-based pricing
            }),
          });

          if (!estimateResponse.ok) {
            throw new Error('Failed to estimate payment cost');
          }

          const estimate = await estimateResponse.json();
          
          // Initiate payment directly - wallet will show confirmation
          toast.info('Please approve the transaction in your wallet...');
          const signature = await initiatePayment(estimate.usdcAmount);

          if (!signature) {
            setIsThinking(false);
            return false;
          }

          // Verify payment with backend
          toast.info('Verifying payment...');
          const verifyResponse = await fetch(`${API_URL}/api/payment/solana/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              signature,
              expectedAmount: estimate.usdcAmount,
              purpose: 'llm_payment',
            }),
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || 'Payment verification failed');
          }

          const verification = await verifyResponse.json();
          
          if (!verification.verified) {
            throw new Error('Payment verification failed');
          }

          toast.success('Payment confirmed! Processing your request...');
          // Payment successful - continue with chat request
        } catch (error) {
          console.error('Solana payment error:', error);
          setIsThinking(false);
          toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
          return false;
        }
      }

      // Continue with normal chat flow (whether payment was used or not)
      // Note: Input will be cleared by ChatInput component after successful send
      const userMessage: Message = {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        content,
        timestamp: new Date(),
        cost: 0,
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsThinking(true);
      setIsGenerating(true);
      resetStopSignal();

      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
        thinkingTimeoutRef.current = null;
      }

      const aiMessageId = Math.random().toString(36).slice(2);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isNew: true,
        },
      ]);

      const isNewChat = !activeConversationId;
      let tempId: string | null = null;
      if (isNewChat) {
        tempId = `pending-${Date.now()}`;
        pendingSessionTempIdRef.current = tempId;
        setActiveConversationId(tempId);
        setConversations((prev) => [
          {
            id: tempId,
            name: 'New conversation',
            timestamp: new Date(),
            unread: false,
            preview: undefined,
            isStreaming: true,
            streamingPreview: 'Generating...',
          },
          ...prev,
        ]);
      }

      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const body: Record<string, unknown> = {
          message: content,
          temperature: 0.7,
          maxTokens: 10000,
          mode,
        };
        if (activeConversationId && !tempId) body.sessionId = activeConversationId;

        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        const newSessionId = response.headers.get('X-Chat-Session-Id');
        if (newSessionId && isNewChat) {
          if (tempId) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === tempId
                  ? { ...c, id: newSessionId, isStreaming: true, streamingPreview: 'Generating...' }
                  : c
              )
            );
            setActiveConversationId((prev) => (prev === tempId ? newSessionId : prev));
            pendingSessionTempIdRef.current = null;
          } else {
            setActiveConversationId(newSessionId);
            setConversations((prev) => {
              if (prev.some((c) => c.id === newSessionId)) return prev;
              return [
                {
                  id: newSessionId,
                  name: 'New conversation',
                  timestamp: new Date(),
                  unread: false,
                  preview: undefined,
                  isStreaming: true,
                  streamingPreview: 'Generating...',
                },
                ...prev,
              ];
            });
          }
        }

        if (!response.ok) {
          const pendingId = pendingSessionTempIdRef.current;
          if (pendingId) {
            pendingSessionTempIdRef.current = null;
            setConversations((prev) => prev.filter((c) => c.id !== pendingId));
            setActiveConversationId((prev) => (prev === pendingId ? null : prev));
          }
          let errorMessage: string;
          try {
            const resBody = await response.json();
            if (response.status === 401)
              errorMessage = resBody.error || 'Session expired or not logged in. Please log in again.';
            else if (response.status === 402)
              errorMessage =
                resBody.current_balance_usd != null && resBody.required_usd != null
                  ? `Insufficient balance. Current: $${Number(resBody.current_balance_usd).toFixed(2)}. Minimum required: $${Number(resBody.required_usd).toFixed(2)}. Please top up your account.`
                  : resBody.error || 'Insufficient balance. Please top up your account.';
            else if (response.status === 500)
              errorMessage = resBody.error || 'Server error. Please try again later.';
            else errorMessage = resBody.error || `Request failed (${response.status}).`;
          } catch {
            errorMessage =
              response.status === 401
                ? 'Session expired or not logged in. Please log in again.'
                : response.status === 402
                  ? 'Insufficient balance. Please top up your account.'
                  : response.status === 500
                    ? 'Server error. Please try again later.'
                    : `Request failed (${response.status}).`;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) throw new Error('No response body available');

        setIsThinking(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6);

              if (data === '[DONE]') {
                setIsGenerating(false);
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === aiMessageId ? { ...msg, isNew: false } : msg))
                );
                if (newSessionId) {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === newSessionId ? { ...c, isStreaming: false, streamingPreview: undefined } : c
                    )
                  );
                }
                if (newSessionId && accessToken) {
                  fetchSessions(accessToken)
                    .then(({ sessions }) => {
                      setConversations(sessions.map(sessionToConversation));
                      if (pendingSessionTempIdRef.current && sessions.length > 0) {
                        setActiveConversationId(sessions[0].id);
                        pendingSessionTempIdRef.current = null;
                      }
                    })
                    .catch(() => {});
                }
                return true;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: `Error: ${parsed.error}`, isNew: false }
                        : msg
                    )
                  );
                  setIsGenerating(false);
                  setIsThinking(false);
                  if (newSessionId) {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === newSessionId ? { ...c, isStreaming: false, streamingPreview: undefined } : c
                      )
                    );
                  }
                  return false;
                }

                // Handle "thinking" events for code-max mode
                if (parsed.type === 'thinking' && parsed.text) {
                  setIsThinking(true);
                  setThinkingText(parsed.text);
                  continue;
                }

                if (parsed.content) {
                  // When content starts, stop thinking
                  setIsThinking(false);
                  setThinkingText('');
                  accumulatedResponse += parsed.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId ? { ...msg, content: accumulatedResponse } : msg
                    )
                  );
                  const preview = accumulatedResponse.replace(/\s+/g, ' ').trim().slice(0, 50);
                  if (preview && newSessionId) {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === newSessionId
                          ? {
                              ...c,
                              isStreaming: true,
                              streamingPreview:
                                preview + (accumulatedResponse.length > 50 ? '...' : ''),
                            }
                          : c
                      )
                    );
                  }
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }

        setIsGenerating(false);
        setIsThinking(false);
        if (newSessionId) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === newSessionId ? { ...c, isStreaming: false, streamingPreview: undefined } : c
            )
          );
        }
        if ((newSessionId || activeConversationId) && accessToken) {
          fetchSessions(accessToken)
            .then(({ sessions }) => {
              setConversations(sessions.map(sessionToConversation));
              if (pendingSessionTempIdRef.current && sessions.length > 0) {
                setActiveConversationId(sessions[0].id);
                pendingSessionTempIdRef.current = null;
              }
            })
            .catch(() => {});
        }
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, isNew: false } : msg))
        );
      } catch (error) {
        const pendingId = pendingSessionTempIdRef.current;
        if (pendingId) {
          pendingSessionTempIdRef.current = null;
          setConversations((prev) => prev.filter((c) => c.id !== pendingId));
          setActiveConversationId((prev) => (prev === pendingId ? null : prev));
        }
        if (error instanceof Error && error.name === 'AbortError') {
          setIsGenerating(false);
        setIsThinking(false);
        setThinkingText('');
        return false;
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to server.'}`,
                isNew: false,
              }
            : msg
        )
      );
      setIsGenerating(false);
      setIsThinking(false);
      setThinkingText('');
        return false;
      } finally {
        abortControllerRef.current = null;
      }

      return true;
    },
    [isLoggedIn, accessToken, activeConversationId, connected, isPaymentEnabled, initiatePayment]
  );

  const stopGeneration = useCallback(() => {
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setThinkingText('');
    setIsGenerating(false);
    stopAllTypewriters();
  }, []);

  const onTypingComplete = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isNew: false } : msg))
    );
  }, []);

  const value: ChatContextValue = {
    conversations,
    activeConversationId,
    messages,
    isThinking,
    thinkingText,
    isGenerating,
    messagesLoading,
    sessionsLoading,
    inputNotice,
    setInputNotice,
    newChat,
    selectConversation,
    deleteSession: deleteSessionById,
    sendMessage,
    stopGeneration,
    onTypingComplete,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (ctx === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}
