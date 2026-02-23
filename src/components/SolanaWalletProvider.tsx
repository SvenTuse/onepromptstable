/**
 * Solana Wallet Provider Wrapper
 * 
 * Wraps the application with Solana wallet adapter providers
 */

import React, { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapters - only import what's available
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Default styles for wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: ReactNode;
}

export const SolanaWalletProvider: React.FC<SolanaWalletProviderProps> = ({ children }) => {
  // Network configuration - use mainnet-beta for production
  const network = WalletAdapterNetwork.Mainnet;

  // RPC endpoint - use custom endpoint from env or default to public
  const endpoint = useMemo(() => {
    const customRPC = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
    if (customRPC) {
      return customRPC;
    }
    return clusterApiUrl(network);
  }, [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        wsEndpoint: import.meta.env.VITE_SOLANA_WS_ENDPOINT,
      }}
    >
      <WalletProvider 
        wallets={wallets} 
        autoConnect={true}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
