/**
 * Solana Wallet Context
 * 
 * React context for managing Solana wallet connection state
 * and USDC payment functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { toast } from 'sonner';

interface SolanaPaymentContextType {
  // Wallet state
  connected: boolean;
  connecting: boolean;
  walletAddress: string | null;
  usdcBalance: number;
  solBalance: number;
  
  // Payment functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  initiatePayment: (amountUSDC: number) => Promise<string | null>;
  verifyPayment: (signature: string) => Promise<boolean>;
  
  // Status
  isPaymentEnabled: boolean;
  paymentStatus: 'idle' | 'requesting' | 'signing' | 'confirming' | 'confirmed' | 'failed';
  lastTransaction: string | null;
  
  // Utilities
  refreshBalances: () => Promise<void>;
  estimateFee: () => Promise<number>;
}

const SolanaPaymentContext = createContext<SolanaPaymentContextType | undefined>(undefined);

interface SolanaPaymentProviderProps {
  children: ReactNode;
}

export const SolanaPaymentProvider: React.FC<SolanaPaymentProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const { 
    publicKey, 
    connected, 
    connecting, 
    connect, 
    disconnect, 
    sendTransaction,
    wallet,
  } = useWallet();

  // State
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'requesting' | 'signing' | 'confirming' | 'confirmed' | 'failed'>('idle');
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(false);

  // Get wallet address
  const walletAddress = publicKey?.toBase58() || null;

  /**
   * Refresh USDC and SOL balances
   */
  const refreshBalances = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      // Import the payment service dynamically to avoid circular dependencies
      const { solanaPaymentService } = await import('../services/solana-payment-service');
      
      // Get USDC balance
      const usdc = await solanaPaymentService.getUSDCBalance(publicKey.toBase58());
      setUsdcBalance(usdc);

      // Get SOL balance
      const solLamports = await connection.getBalance(publicKey);
      const sol = solLamports / 1_000_000_000; // Convert lamports to SOL
      setSolBalance(sol);

      // Check if wallet has sufficient SOL for fees
      const hasSufficientSOL = await solanaPaymentService.hasSufficientSOLForFees(publicKey.toBase58());
      setIsPaymentEnabled(usdc > 0 && hasSufficientSOL);
      
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast.error('Failed to refresh wallet balances');
    }
  }, [publicKey, connection]);

  /**
   * Connect wallet
   */
  const connectWallet = useCallback(async () => {
    try {
      if (!wallet) {
        toast.error('Please select a wallet first');
        return;
      }
      await connect();
      toast.success('Wallet connected successfully');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  }, [connect, wallet]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    disconnect();
    setUsdcBalance(0);
    setSolBalance(0);
    setIsPaymentEnabled(false);
    setPaymentStatus('idle');
    setLastTransaction(null);
    toast.info('Wallet disconnected');
  }, [disconnect]);

  /**
   * Initiate USDC payment
   */
  const initiatePayment = useCallback(async (amountUSDC: number): Promise<string | null> => {
    if (!publicKey || !connection) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      setPaymentStatus('requesting');
      
      // Import the payment service
      const { solanaPaymentService } = await import('../services/solana-payment-service');

      // Check balances
      if (usdcBalance < amountUSDC) {
        toast.error(`Insufficient USDC balance. Required: ${amountUSDC}, Available: ${usdcBalance.toFixed(6)}`);
        setPaymentStatus('failed');
        return null;
      }

      const hasSufficientSOL = await solanaPaymentService.hasSufficientSOLForFees(publicKey.toBase58());
      if (!hasSufficientSOL) {
        toast.error('Insufficient SOL for transaction fees');
        setPaymentStatus('failed');
        return null;
      }

      // Create transaction
      const transaction = await solanaPaymentService.createUSDCTransferTransaction(
        publicKey.toBase58(),
        amountUSDC
      );

      setPaymentStatus('signing');
      toast.info('Please approve the transaction in your wallet');

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      setPaymentStatus('confirming');
      setLastTransaction(signature);
      
      toast.info('Transaction submitted. Waiting for confirmation...');

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        setPaymentStatus('failed');
        toast.error('Transaction failed');
        return null;
      }

      setPaymentStatus('confirmed');
      toast.success('Payment confirmed successfully!');

      // Refresh balances
      await refreshBalances();

      return signature;
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction rejected by user');
        } else {
          toast.error(`Payment failed: ${error.message}`);
        }
      } else {
        toast.error('Payment failed');
      }
      
      return null;
    } finally {
      // Reset status after a delay, but don't disconnect wallet
      setTimeout(() => {
        setPaymentStatus('idle');
      }, 3000);
    }
  }, [publicKey, connection, sendTransaction, usdcBalance, refreshBalances, paymentStatus]);

  /**
   * Verify payment transaction
   */
  const verifyPayment = useCallback(async (signature: string): Promise<boolean> => {
    try {
      const { solanaPaymentService } = await import('../services/solana-payment-service');
      
      const result = await solanaPaymentService.verifyTransaction(signature);
      
      if (!result.confirmed) {
        console.error('Transaction verification failed:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }, []);

  /**
   * Estimate transaction fee
   */
  const estimateFee = useCallback(async (): Promise<number> => {
    try {
      const { solanaPaymentService } = await import('../services/solana-payment-service');
      return await solanaPaymentService.estimateTransactionFee();
    } catch (error) {
      console.error('Error estimating fee:', error);
      return 0.000005; // Fallback estimate
    }
  }, []);

  // Refresh balances when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalances();
      
      // Set up periodic balance refresh (every 30 seconds)
      const interval = setInterval(refreshBalances, 30000);
      
      return () => clearInterval(interval);
    }
  }, [connected, publicKey, refreshBalances]);

  const value: SolanaPaymentContextType = {
    connected,
    connecting,
    walletAddress,
    usdcBalance,
    solBalance,
    connectWallet,
    disconnectWallet,
    initiatePayment,
    verifyPayment,
    isPaymentEnabled,
    paymentStatus,
    lastTransaction,
    refreshBalances,
    estimateFee,
  };

  return (
    <SolanaPaymentContext.Provider value={value}>
      {children}
    </SolanaPaymentContext.Provider>
  );
};

/**
 * Hook to use Solana payment context
 */
export const useSolanaPayment = (): SolanaPaymentContextType => {
  const context = useContext(SolanaPaymentContext);
  if (!context) {
    throw new Error('useSolanaPayment must be used within SolanaPaymentProvider');
  }
  return context;
};
