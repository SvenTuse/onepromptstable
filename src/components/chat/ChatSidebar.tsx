import { MessageSquare, Plus, Search, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ChatConversation {
  id: string;
  name: string;
  timestamp: Date;
  unread: boolean;
  preview?: string;
  /** When true, show animated loading dots and use streamingPreview as live title */
  isStreaming?: boolean;
  streamingPreview?: string;
}

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession?: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDeleteSession,
}: ChatSidebarProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-9 bg-sidebar-accent/50 border-sidebar-border"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full p-3 rounded-lg text-left transition-colors group",
                "hover:bg-sidebar-accent",
                activeId === conv.id && "bg-sidebar-accent"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm truncate",
                      conv.unread ? "font-semibold text-sidebar-foreground" : "text-sidebar-foreground/80"
                    )}>
                      {conv.isStreaming && conv.streamingPreview
                        ? conv.streamingPreview
                        : conv.name}
                      {conv.isStreaming && (
                        <span className="inline-flex ml-1 gap-0.5" aria-hidden>
                          <span className="w-1 h-1 rounded-full bg-current opacity-60 animate-pulse" />
                          <span className="w-1 h-1 rounded-full bg-current opacity-60 animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 rounded-full bg-current opacity-60 animate-pulse" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTime(conv.timestamp)}
                    </span>
                  </div>
                  {conv.preview && !conv.isStreaming && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.preview}
                    </p>
                  )}
                </div>
                {conv.unread && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                )}
                {onDeleteSession ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        className="inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 h-6 w-6 flex-shrink-0 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="h-6 w-6 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}