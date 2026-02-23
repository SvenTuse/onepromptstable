import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { ChatProvider, useChat } from '@/contexts/ChatContext';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchBalance } from '@/lib/api';

function IndexContent() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { isAuthenticated, user, login, register, logout, accessToken } = useAuth();
  const isLoggedIn = isAuthenticated;
  const userName = user?.username ?? user?.email ?? undefined;
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chat = useChat();

  // Fetch balance when user logs in
  const refreshBalance = useCallback(async () => {
    if (!isLoggedIn || !accessToken) {
      setBalance(0);
      return;
    }
    
    try {
      setBalanceLoading(true);
      const balanceData = await fetchBalance(accessToken);
      setBalance(balanceData.balance_usd);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // Keep previous balance on error
    } finally {
      setBalanceLoading(false);
    }
  }, [isLoggedIn, accessToken]);

  // Fetch balance on mount and when auth state changes
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const handleAuth = useCallback(
    async (email: string, password: string, name?: string) => {
      if (name) {
        await register(email, password, name.trim() || email.split('@')[0]);
      } else {
        await login(email, password);
      }
    },
    [login, register]
  );

  const handleTopUp = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  const handleNewChat = useCallback(() => {
    chat.newChat();
    setSidebarOpen(false);
  }, [chat]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      chat.selectConversation(id);
      setSidebarOpen(false);
    },
    [chat]
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userName={userName}
        userPicture={user?.picture}
        balance={balance}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSetTheme={setTheme}
        onAuth={handleAuth}
        onTopUp={handleTopUp}
        onLogout={logout}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-40 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div
          className={cn(
            'absolute lg:relative inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 lg:transform-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <ChatSidebar
            conversations={chat.conversations}
            activeId={chat.activeConversationId ?? undefined}
            onSelect={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteSession={isLoggedIn ? chat.deleteSession : undefined}
          />
        </div>

        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <ChatPanel
            messages={chat.messages}
            balance={balanceLoading ? balance : balance}
            isLoggedIn={isLoggedIn}
            theme={theme}
            inputNotice={chat.inputNotice}
            isThinking={chat.isThinking}
            thinkingText={chat.thinkingText}
            isGenerating={chat.isGenerating}
            messagesLoading={chat.messagesLoading}
            activeConversationId={chat.activeConversationId}
            onSend={async (...args) => {
              const result = await chat.sendMessage(...args);
              // Refresh balance after successful chat completion
              if (result) {
                refreshBalance();
              }
              return result;
            }}
            onStopGeneration={chat.stopGeneration}
            onTypingComplete={chat.onTypingComplete}
          />
        </div>
      </div>
    </div>
  );
}

const Index = () => (
  <ChatProvider>
    <IndexContent />
  </ChatProvider>
);

export default Index;
