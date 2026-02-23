import { cn } from '@/lib/utils';
import { useTypewriter } from '@/hooks/useTypewriter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
  isNew?: boolean;
}

interface ChatMessageProps {
  message: Message;
  onTypingComplete?: () => void;
}

export function ChatMessage({ message, onTypingComplete }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const shouldAnimate = !isUser && message.isNew;
  const { displayedText, isTyping } = useTypewriter(message.content, 15, shouldAnimate, onTypingComplete);

  return (
    <div className={cn(
      "flex w-full py-3",
      isUser ? "justify-end" : "justify-start"
    )}>
      {isUser ? (
        // User message - right aligned with Champagne background
        <div className="max-w-[70%] min-w-0 rounded-2xl px-4 py-3 bg-primary text-primary-foreground overflow-hidden">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">
            {message.content}
          </p>
        </div>
      ) : (
        // AI message - left aligned with Markdown rendering
        <div className="w-full max-w-none">
          <div className={cn(
            "prose prose-sm prose-invert max-w-none w-full",
            "prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-4",
            "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
            "prose-p:text-foreground prose-p:leading-relaxed prose-p:my-4",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-em:text-foreground",
            "prose-code:text-foreground prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
            "prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4",
            "prose-pre:overflow-x-auto prose-pre:overflow-y-hidden",
            "prose-code:before:content-none prose-code:after:content-none",
            "prose-blockquote:text-muted-foreground prose-blockquote:border-l-4 prose-blockquote:border-l-foreground/20 prose-blockquote:pl-4 prose-blockquote:italic",
            "prose-ul:text-foreground prose-ol:text-foreground prose-ul:my-4 prose-ol:my-4",
            "prose-li:text-foreground prose-li:my-2",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
            "prose-table:text-foreground prose-table:w-full prose-table:my-4",
            "prose-th:text-foreground prose-th:font-semibold prose-th:border prose-th:border-border prose-th:p-2",
            "prose-td:text-foreground prose-td:border prose-td:border-border prose-td:p-2",
            "prose-hr:border-border prose-hr:my-8",
            "prose-img:rounded-lg prose-img:my-4",
            shouldAnimate && "prose-pre:whitespace-pre-wrap"
          )}>
            {shouldAnimate ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayedText}
                </ReactMarkdown>
                {isTyping && <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />}
              </>
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
                {shouldAnimate && isTyping && <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}