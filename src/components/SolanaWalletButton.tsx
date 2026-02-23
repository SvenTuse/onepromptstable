/**
 * Solana Wallet Button Component
 * 
 * Enhanced wallet connection button with balance display
 */

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaPayment } from '../contexts/SolanaPaymentContext';
import { Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SolanaWalletButtonProps {
  variant?: 'default' | 'panel';
}

export const SolanaWalletButton: React.FC<SolanaWalletButtonProps> = ({ 
  variant = 'default' 
}) => {
  const { connected, connecting, disconnect } = useWallet();
  const { 
    walletAddress, 
    usdcBalance, 
    solBalance, 
    refreshBalances,
    isPaymentEnabled,
  } = useSolanaPayment();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <WalletMultiButton 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          width: variant === 'panel' ? '100%' : 'auto',
        }}
      >
        {connecting ? 'Connecting...' : 'Connect Solana Wallet'}
      </WalletMultiButton>
    );
  }

  const buttonClassName = variant === 'panel' 
    ? "w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
    : "gap-2 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant === 'panel' ? 'default' : 'outline'} 
          className={buttonClassName}
        >
          <Wallet className="h-4 w-4" />
          <span className="font-mono text-sm">
            {walletAddress ? formatAddress(walletAddress) : 'Unknown'}
          </span>
          {isPaymentEnabled && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet Balance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">USDC:</span>
            <span className="font-mono font-semibold">
              {usdcBalance.toFixed(6)} USDC
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">SOL:</span>
            <span className="font-mono font-semibold">
              {solBalance.toFixed(6)} SOL
            </span>
          </div>

          {!isPaymentEnabled && usdcBalance === 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ No USDC balance
            </div>
          )}

          {!isPaymentEnabled && solBalance < 0.001 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Low SOL for fees
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Balance
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={disconnect}
          className="gap-2 text-red-600 dark:text-red-400"
        >
          <Wallet className="h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2">
          <div className="text-xs text-muted-foreground">
            {isPaymentEnabled ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ Ready for payments
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠️ Not ready for payments
              </span>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
