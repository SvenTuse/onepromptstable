/**
 * Solana USDC Payment Service
 * 
 * This module handles direct USDC transfers on Solana blockchain
 * for LLM API payment processing.
 * 
 * Treasury wallet: USAisa5xaM2R9CrDcVZ3vhcgqvhumjMHVfE8Ezpu8DB
 */

import {
  Connection,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';

// Configuration constants
const USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Mainnet USDC
const USDC_DECIMALS = 6; // USDC has 6 decimals
const TREASURY_WALLET = 'USAisa5xaM2R9CrDcVZ3vhcgqvhumjMHVfE8Ezpu8DB';

// Solana RPC endpoints (use environment variables in production)
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
const SOLANA_WS_ENDPOINT = process.env.SOLANA_WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com';

/**
 * Service class for handling Solana USDC payments
 */
export class SolanaPaymentService {
  private connection: Connection;
  private usdcMint: PublicKey;
  private treasuryWallet: PublicKey;

  constructor() {
    // Initialize connection to Solana mainnet
    this.connection = new Connection(SOLANA_RPC_ENDPOINT, {
      commitment: 'confirmed',
      wsEndpoint: SOLANA_WS_ENDPOINT,
    });
    
    this.usdcMint = new PublicKey(USDC_MINT_ADDRESS);
    this.treasuryWallet = new PublicKey(TREASURY_WALLET);
  }

  /**
   * Get USDC balance for a wallet
   * @param walletAddress - The wallet public key as string
   * @returns Balance in USDC (not lamports)
   */
  async getUSDCBalance(walletAddress: string): Promise<number> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      // Get associated token account for USDC
      const ata = await getAssociatedTokenAddress(
        this.usdcMint,
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      // Get token account balance
      const balance = await this.connection.getTokenAccountBalance(ata);
      
      if (!balance.value.uiAmount) {
        return 0;
      }
      
      return balance.value.uiAmount;
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return 0;
    }
  }

  /**
   * Create a USDC transfer transaction
   * @param fromWalletAddress - Sender's wallet public key
   * @param amountUSDC - Amount in USDC to transfer
   * @returns Prepared transaction ready for signing
   */
  async createUSDCTransferTransaction(
    fromWalletAddress: string,
    amountUSDC: number
  ): Promise<Transaction> {
    const fromPubkey = new PublicKey(fromWalletAddress);
    
    // Get associated token accounts
    const fromATA = await getAssociatedTokenAddress(
      this.usdcMint,
      fromPubkey,
      false,
      TOKEN_PROGRAM_ID
    );

    const toATA = await getAssociatedTokenAddress(
      this.usdcMint,
      this.treasuryWallet,
      false,
      TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();
    
    // Check if receiver's ATA exists, if not, create it
    const receiverAccount = await this.connection.getAccountInfo(toATA);
    
    if (!receiverAccount) {
      // Create associated token account instruction for receiver
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        fromPubkey, // payer
        toATA, // associated token account
        this.treasuryWallet, // owner
        this.usdcMint, // mint
        TOKEN_PROGRAM_ID
      );
      transaction.add(createATAInstruction);
    }

    // Convert USDC amount to smallest unit (6 decimals)
    const amountInSmallestUnit = Math.floor(amountUSDC * Math.pow(10, USDC_DECIMALS));

    // Create transfer instruction
    const transferInstruction = createTransferCheckedInstruction(
      fromATA, // source
      this.usdcMint, // mint
      toATA, // destination
      fromPubkey, // owner of source account
      amountInSmallestUnit, // amount
      USDC_DECIMALS, // decimals
      [], // multiSigners (empty for single signer)
      TOKEN_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    // Get latest blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction;
  }

  /**
   * Verify transaction confirmation on-chain
   * @param signature - Transaction signature
   * @returns Transaction status and details
   */
  async verifyTransaction(signature: string): Promise<{
    confirmed: boolean;
    amount?: number;
    from?: string;
    to?: string;
    error?: string;
  }> {
    try {
      // Wait for transaction confirmation
      const confirmation = await this.connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        return {
          confirmed: false,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        };
      }

      // Get transaction details
      const tx = await this.connection.getParsedTransaction(
        signature,
        {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        }
      );

      if (!tx || !tx.meta) {
        return {
          confirmed: false,
          error: 'Transaction not found or no metadata',
        };
      }

      // Parse token transfer details
      const postTokenBalances = tx.meta.postTokenBalances || [];
      const preTokenBalances = tx.meta.preTokenBalances || [];

      let transferAmount = 0;
      let fromAddress = '';
      let toAddress = '';

      // Find the USDC transfer in token balances
      for (let i = 0; i < postTokenBalances.length; i++) {
        const post = postTokenBalances[i];
        const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
        
        if (post.mint === USDC_MINT_ADDRESS && pre) {
          const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
          const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
          const diff = postAmount - preAmount;
          
          if (diff > 0) {
            // This is the receiving account
            transferAmount = diff;
            toAddress = post.owner || '';
          } else if (diff < 0) {
            // This is the sending account
            fromAddress = post.owner || '';
          }
        }
      }

      return {
        confirmed: true,
        amount: transferAmount,
        from: fromAddress,
        to: toAddress,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate required USDC amount for API usage
   * @param tokensUsed - Number of tokens used in LLM request
   * @param costPerToken - Cost per token in USD (e.g., 0.000001)
   * @returns Required USDC amount
   */
  calculatePaymentAmount(tokensUsed: number, costPerToken: number): number {
    const totalCost = tokensUsed * costPerToken;
    // Round to 6 decimals (USDC precision) - use proper rounding instead of ceil
    return Math.round(totalCost * 1_000_000) / 1_000_000;
  }

  /**
   * Subscribe to transaction confirmations
   * @param signature - Transaction signature to monitor
   * @param callback - Callback function when transaction is confirmed
   */
  async subscribeToTransaction(
    signature: string,
    callback: (confirmed: boolean, error?: string) => void
  ): Promise<number> {
    const subscriptionId = this.connection.onSignature(
      signature,
      (result, _context) => {
        if (result.err) {
          callback(false, JSON.stringify(result.err));
        } else {
          callback(true);
        }
      },
      'confirmed'
    );

    return subscriptionId;
  }

  /**
   * Unsubscribe from transaction monitoring
   * @param subscriptionId - Subscription ID returned from subscribeToTransaction
   */
  async unsubscribeFromTransaction(subscriptionId: number): Promise<void> {
    await this.connection.removeSignatureListener(subscriptionId);
  }

  /**
   * Estimate transaction fee in SOL
   * @returns Estimated fee in SOL
   */
  async estimateTransactionFee(): Promise<number> {
    try {
      // Get recent prioritization fees
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees.length === 0) {
        // Default estimate: 0.000005 SOL (~5000 lamports)
        return 0.000005;
      }

      // Calculate median fee
      const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
      const medianFee = fees[Math.floor(fees.length / 2)];
      
      // Base fee + median prioritization fee
      // Typical transaction is ~5000 lamports base
      const totalLamports = 5000 + medianFee;
      
      return totalLamports / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error estimating fee:', error);
      return 0.000005; // Fallback estimate
    }
  }

  /**
   * Check if wallet has sufficient SOL for transaction fees
   * @param walletAddress - Wallet address to check
   * @returns True if wallet has enough SOL for fees
   */
  async hasSufficientSOLForFees(walletAddress: string): Promise<boolean> {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(pubkey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      const estimatedFee = await this.estimateTransactionFee();
      
      // Require at least 2x the estimated fee for safety
      return solBalance >= estimatedFee * 2;
    } catch (error) {
      console.error('Error checking SOL balance:', error);
      return false;
    }
  }

  /**
   * Get connection health status
   * @returns Connection health information
   */
  async getConnectionHealth(): Promise<{
    healthy: boolean;
    slot?: number;
    blockTime?: number;
    error?: string;
  }> {
    try {
      const slot = await this.connection.getSlot('confirmed');
      const blockTime = await this.connection.getBlockTime(slot);
      
      return {
        healthy: true,
        slot,
        blockTime: blockTime || undefined,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const solanaPaymentService = new SolanaPaymentService();

// Export types
export interface PaymentTransaction {
  signature: string;
  amount: number;
  from: string;
  to: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface PaymentEstimate {
  amountUSDC: number;
  estimatedFeeSOL: number;
  totalCostUSD: number;
}
