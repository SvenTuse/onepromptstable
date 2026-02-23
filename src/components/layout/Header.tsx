import { ProfileOverlay } from '@/components/profile/ProfileOverlay';
import { AuthModal } from '@/components/profile/AuthModal';
import { useState } from 'react';
interface HeaderProps {
  isLoggedIn: boolean;
  userName?: string;
  userPicture?: string;
  balance: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onAuth: (email: string, password: string, name?: string) => void;
  onTopUp: (amount: number) => void;
  onLogout: () => void;
}
export function Header({
  isLoggedIn,
  userName,
  userPicture,
  balance,
  theme,
  onToggleTheme,
  onSetTheme,
  onAuth,
  onTopUp,
  onLogout,
}: HeaderProps) {
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
  }>({
    open: false,
    mode: 'login'
  });
  return <header className="h-14 border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="font-semibold text-base leading-tight">Oneprompt</h1>
          </div>
        </div>


        {/* Auth / Profile */}
        <ProfileOverlay isLoggedIn={isLoggedIn} userName={userName} userPicture={userPicture} balance={balance} theme={theme} onToggleTheme={onToggleTheme} onSetTheme={onSetTheme} onLogin={() => setAuthModal({
        open: true,
        mode: 'login'
      })} onSignUp={() => setAuthModal({
        open: true,
        mode: 'signup'
      })} onTopUp={onTopUp} onLogout={onLogout} />
      </div>

      <AuthModal open={authModal.open} onOpenChange={open => setAuthModal(prev => ({
      ...prev,
      open
    }))} mode={authModal.mode} onAuth={onAuth} />
    </header>;
}