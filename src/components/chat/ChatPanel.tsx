import { useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { GenerationMode } from '@/lib/pricing';
import { Attachment } from './AttachmentChip';
import logoImage from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';

const SCROLL_AT_BOTTOM_THRESHOLD = 100;

interface ChatPanelProps {
  messages: Message[];
  balance: number;
  isLoggedIn: boolean;
  theme: 'light' | 'dark';
  inputNotice?: string | null;
  isThinking?: boolean;
  thinkingText?: string;
  isGenerating?: boolean;
  messagesLoading?: boolean;
  activeConversationId?: string | null;
  onSend: (message: string, mode: GenerationMode, attachments: Attachment[], cost: number) => boolean | Promise<boolean>;
  onStopGeneration?: () => void;
  onTypingComplete?: (messageId: string) => void;
}

export function ChatPanel({
  messages,
  balance,
  isLoggedIn,
  theme,
  inputNotice,
  isThinking,
  thinkingText,
  isGenerating,
  messagesLoading = false,
  activeConversationId = null,
  onSend,
  onStopGeneration,
  onTypingComplete
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);
  // logo.png (logoImage) — тёмная тема; logo-light.png — светлая тема
  const logo = theme === 'light' ? logoLight : logoImage;

  const checkIfAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_AT_BOTTOM_THRESHOLD;
    isUserAtBottomRef.current = atBottom;
  }, []);

  useEffect(() => {
    if (isUserAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages]);
  const showLandingPage = messages.length === 0 && !activeConversationId && !messagesLoading;
  const showLoadingState = messages.length === 0 && activeConversationId && messagesLoading;
  return <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin"
        onScroll={checkIfAtBottom}
      >
        {showLoadingState ? (
          <div className="h-full flex flex-col items-center justify-center px-4 pb-32">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
          </div>
        ) : showLandingPage ? <div className="h-full flex flex-col items-center justify-center px-4 pb-32">
            <div className="w-48 h-48 flex items-center justify-center mb-6">
              <img src={logo} alt="Apiece AI Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-semibold text-center mb-2">Start a conversation with onepromt.ai</h2>
            <p className="text-muted-foreground text-center max-w-md"> Choose a generation mode for specialized tasks like reasoning, data analytics, or image generation.</p>
            
            {/* Quick suggestions */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {[{
            title: 'Explain quantum computing',
            subtitle: 'in simple terms'
          }, {
            title: 'Generate a business plan',
            subtitle: 'for a startup idea'
          }, {
            title: 'Analyze this dataset',
            subtitle: 'and create visualizations'
          }, {
            title: 'Write a creative story',
            subtitle: 'about future technology'
          }].map((suggestion, i) => <button key={i} className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card text-left transition-colors group">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {suggestion.subtitle}
                  </p>
                </button>)}
            </div>
          </div> : <div className="max-w-4xl mx-auto w-full min-w-0 px-4 sm:px-6">
            {messages.map((message, index) => <ChatMessage key={message.id} message={message} onTypingComplete={index === messages.length - 1 ? () => onTypingComplete?.(message.id) : undefined} />)}
            {isThinking && <ThinkingIndicator text={thinkingText} />}
            <div ref={messagesEndRef} />
          </div>}
      </div>

      {/* Input Area */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-4">
        <ChatInput onSend={onSend} balance={balance} notice={inputNotice ?? undefined} isGenerating={isGenerating} onStopGeneration={onStopGeneration} />
      </div>
    </div>;
}