import { useState } from 'react';
import { User, Settings, Moon, Sun, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { TopUpModal } from './TopUpModal';
import { X402Panel } from './X402Panel';
import { PaymentMethodButtons } from '@/components/payments/PaymentMethodButtons';
import { SettingsOverlay } from './SettingsOverlay';

interface ProfileOverlayProps {
  isLoggedIn: boolean;
  userName?: string;
  userPicture?: string;
  balance: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onLogin: () => void;
  onSignUp: () => void;
  onTopUp: (amount: number) => void;
  onLogout: () => void;
}

export function ProfileOverlay({
  isLoggedIn,
  userName = 'Guest',
  userPicture,
  balance,
  theme,
  onToggleTheme,
  onSetTheme,
  onLogin,
  onSignUp,
  onTopUp,
  onLogout,
}: ProfileOverlayProps) {
  const [open, setOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showX402, setShowX402] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [autoEstimate, setAutoEstimate] = useState(true);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onLogin}>
          Login
        </Button>
        <Button size="sm" onClick={onSignUp}>
          Sign Up
        </Button>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            {userPicture ? (
              <img 
                src={userPicture} 
                alt={userName} 
                className="w-7 h-7 rounded-full object-cover"
                onError={(e) => {
                  // Fallback to User icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center",
              userPicture && "hidden"
            )}>
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline">{userName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
          {/* Profile Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {userPicture ? (
                <img 
                  src={userPicture} 
                  alt={userName} 
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center",
                userPicture && "hidden"
              )}>
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className="text-lg font-semibold">${balance.toFixed(2)}</span>
            </div>
            <PaymentMethodButtons
              className="w-full"
              cardLabel="Top Up"
              x402Label="x402"
              size="sm"
              fill
              onCardClick={() => {
                setOpen(false);
                setShowTopUp(true);
              }}
              onX402Click={() => setShowX402(!showX402)}
            />

            {/* x402 Panel */}
            {showX402 && (
              <X402Panel onClose={() => setShowX402(false)} />
            )}
          </div>

          {/* Settings & Theme */}
          <div className="p-2">
            <button
              onClick={() => {
                setOpen(false);
                setShowSettingsOverlay(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Settings</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Theme</span>
              <span className="text-xs text-muted-foreground ml-auto capitalize">{theme}</span>
            </button>

            <div className="border-t border-border my-1" />
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">Log out</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <TopUpModal 
        open={showTopUp} 
        onOpenChange={setShowTopUp}
        onTopUp={onTopUp}
      />

      <SettingsOverlay
        open={showSettingsOverlay}
        onClose={() => setShowSettingsOverlay(false)}
        theme={theme}
        onSetTheme={onSetTheme}
      />
    </>
  );
}