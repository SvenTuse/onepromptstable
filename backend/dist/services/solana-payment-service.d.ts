/**
 * Solana USDC Payment Service
 *
 * This module handles direct USDC transfers on Solana blockchain
 * for LLM API payment processing.
 *
 * Treasury wallet: USAisa5xaM2R9CrDcVZ3vhcgqvhumjMHVfE8Ezpu8DB
 */
import { Transaction } from '@solana/web3.js';
/**
 * Service class for handling Solana USDC payments
 */
export declare class SolanaPaymentService {
    private connection;
    private usdcMint;
    private treasuryWallet;
    constructor();
    /**
     * Get USDC balance for a wallet
     * @param walletAddress - The wallet public key as string
     * @returns Balance in USDC (not lamports)
     */
    getUSDCBalance(walletAddress: string): Promise<number>;
    /**
     * Create a USDC transfer transaction
     * @param fromWalletAddress - Sender's wallet public key
     * @param amountUSDC - Amount in USDC to transfer
     * @returns Prepared transaction ready for signing
     */
    createUSDCTransferTransaction(fromWalletAddress: string, amountUSDC: number): Promise<Transaction>;
    /**
     * Verify transaction confirmation on-chain
     * @param signature - Transaction signature
     * @returns Transaction status and details
     */
    verifyTransaction(signature: string): Promise<{
        confirmed: boolean;
        amount?: number;
        from?: string;
        to?: string;
        error?: string;
    }>;
    /**
     * Calculate required USDC amount for API usage
     * @param tokensUsed - Number of tokens used in LLM request
     * @param costPerToken - Cost per token in USD (e.g., 0.000001)
     * @returns Required USDC amount
     */
    calculatePaymentAmount(tokensUsed: number, costPerToken: number): number;
    /**
     * Subscribe to transaction confirmations
     * @param signature - Transaction signature to monitor
     * @param callback - Callback function when transaction is confirmed
     */
    subscribeToTransaction(signature: string, callback: (confirmed: boolean, error?: string) => void): Promise<number>;
    /**
     * Unsubscribe from transaction monitoring
     * @param subscriptionId - Subscription ID returned from subscribeToTransaction
     */
    unsubscribeFromTransaction(subscriptionId: number): Promise<void>;
    /**
     * Estimate transaction fee in SOL
     * @returns Estimated fee in SOL
     */
    estimateTransactionFee(): Promise<number>;
    /**
     * Check if wallet has sufficient SOL for transaction fees
     * @param walletAddress - Wallet address to check
     * @returns True if wallet has enough SOL for fees
     */
    hasSufficientSOLForFees(walletAddress: string): Promise<boolean>;
    /**
     * Get connection health status
     * @returns Connection health information
     */
    getConnectionHealth(): Promise<{
        healthy: boolean;
        slot?: number;
        blockTime?: number;
        error?: string;
    }>;
}
export declare const solanaPaymentService: SolanaPaymentService;
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
//# sourceMappingURL=solana-payment-service.d.ts.map