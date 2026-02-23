"use strict";
/**
 * Backend Integration for Solana Payments
 *
 * This module integrates with the existing LLM router backend
 * to handle payment verification and balance management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const solana_payment_service_1 = require("../services/solana-payment-service");
const balance_service_1 = require("../services/balance.service");
const pricing_1 = require("../utils/pricing");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
/**
 * GET /api/payment/solana/config
 * Get Solana payment configuration
 */
router.get('/solana/config', (_req, res) => {
    res.json({
        treasuryWallet: 'USAisa5xaM2R9CrDcVZ3vhcgqvhumjMHVfE8Ezpu8DB',
        usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        network: 'mainnet-beta',
        rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    });
});
/**
 * GET /api/payment/solana/health
 * Check Solana connection health
 */
router.get('/solana/health', async (_req, res) => {
    try {
        const health = await solana_payment_service_1.solanaPaymentService.getConnectionHealth();
        res.json(health);
    }
    catch (error) {
        res.status(500).json({
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/payment/solana/balance/:walletAddress
 * Get USDC balance for a wallet
 */
router.get('/solana/balance/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const balance = await solana_payment_service_1.solanaPaymentService.getUSDCBalance(walletAddress);
        const hasSufficientSOL = await solana_payment_service_1.solanaPaymentService.hasSufficientSOLForFees(walletAddress);
        res.json({
            walletAddress,
            usdcBalance: balance,
            hasSufficientSOL,
            isPaymentEnabled: balance > 0 && hasSufficientSOL,
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch balance',
        });
    }
});
/**
 * POST /api/payment/solana/estimate
 * Estimate payment amount for LLM usage
 */
router.post('/solana/estimate', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { model, estimatedTokens, mode, message } = req.body;
        if (!model || !estimatedTokens) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Use the same pricing calculation as the chat route
        let usdcAmount = 0;
        if (mode && message) {
            // Use the backend pricing utility for accurate calculation (returns millidollars)
            const chargeUnits = (0, pricing_1.calculateChargeCents)(mode, message);
            usdcAmount = chargeUnits / 1000; // Convert to USD/USDC
        }
        else {
            // Fallback to token-based estimation if mode/message not provided
            const modelCosts = {
                'claude-sonnet-4': 0.003,
                'claude-opus-4': 0.015,
                'gpt-4': 0.03,
                'gpt-3.5-turbo': 0.0015,
            };
            const costPer1KTokens = modelCosts[model] || 0.003;
            const costPerToken = costPer1KTokens / 1000;
            usdcAmount = solana_payment_service_1.solanaPaymentService.calculatePaymentAmount(estimatedTokens, costPerToken);
        }
        // Round to 6 decimal places (USDC precision)
        usdcAmount = Math.round(usdcAmount * 1000000) / 1000000;
        const estimatedFee = await solana_payment_service_1.solanaPaymentService.estimateTransactionFee();
        res.json({
            model,
            estimatedTokens,
            usdcAmount,
            estimatedFeeSOL: estimatedFee,
            totalCostUSD: usdcAmount, // USDC is 1:1 with USD
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to estimate payment',
        });
    }
});
/**
 * POST /api/payment/solana/verify
 * Verify a Solana payment transaction
 */
router.post('/solana/verify', auth_middleware_1.authenticate, async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { signature, expectedAmount, purpose } = req.body;
        const userId = req.user.userId;
        if (!signature || !expectedAmount) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Verify the transaction on-chain
        const verification = await solana_payment_service_1.solanaPaymentService.verifyTransaction(signature);
        if (!verification.confirmed) {
            res.status(400).json({
                verified: false,
                error: verification.error || 'Transaction not confirmed',
            });
            return;
        }
        // Check if transaction has already been processed
        await client.query('BEGIN');
        const existingTx = await client.query('SELECT * FROM solana_transactions WHERE signature = $1', [signature]);
        if (existingTx.rows.length > 0) {
            // Transaction already processed - check if balance was already credited
            await client.query('ROLLBACK');
            client.release();
            // Check if balance was already credited by checking transactions table
            const existingBalanceTx = await database_1.default.query(`SELECT * FROM transactions 
         WHERE user_id = $1::uuid 
         AND (metadata->>'solana_signature' = $2 OR description LIKE $3)
         ORDER BY created_at DESC LIMIT 1`, [userId, signature, `%${signature.slice(0, 8)}%`]);
            if (existingBalanceTx.rows.length > 0) {
                res.json({
                    verified: true,
                    signature,
                    amount: existingTx.rows[0].amount_usdc,
                    alreadyProcessed: true,
                    message: 'Transaction already processed and credited',
                });
                return;
            }
            // Transaction recorded but balance not credited - credit it now (millidollars)
            const amountCents = Math.max(1, Math.round((existingTx.rows[0].amount_usdc || 0) * 1000));
            try {
                const transaction = await balance_service_1.BalanceService.deposit(userId, amountCents, `Solana USDC payment (retry): ${signature.slice(0, 8)}...`);
                res.json({
                    verified: true,
                    signature,
                    amount: existingTx.rows[0].amount_usdc,
                    transaction: transaction,
                    message: 'Transaction verified and credited successfully',
                });
                return;
            }
            catch (depositError) {
                console.error('Error crediting balance for existing transaction:', depositError);
                throw depositError;
            }
        }
        // Verify amount matches expected (allow 1% tolerance for rounding)
        const amountDiff = Math.abs((verification.amount || 0) - expectedAmount);
        const tolerance = expectedAmount * 0.01;
        if (amountDiff > tolerance) {
            await client.query('ROLLBACK');
            res.status(400).json({
                verified: false,
                error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${verification.amount}`,
            });
            return;
        }
        // Record the transaction
        await client.query(`INSERT INTO solana_transactions 
       (signature, user_id, amount_usdc, from_address, to_address, purpose, verified_at)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, NOW())`, [
            signature,
            userId,
            verification.amount,
            verification.from,
            verification.to,
            purpose || 'llm_payment',
        ]);
        // Credit the user's balance (convert USDC to millidollars: 1 unit = $0.001)
        const amountCents = Math.max(1, Math.round((verification.amount || 0) * 1000));
        const transaction = await balance_service_1.BalanceService.deposit(userId, amountCents, `Solana USDC payment: ${signature.slice(0, 8)}...`);
        await client.query('COMMIT');
        res.json({
            verified: true,
            signature,
            amount: verification.amount,
            transaction: transaction,
            message: 'Payment verified and credited successfully',
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Payment verification error:', error);
        res.status(500).json({
            verified: false,
            error: error instanceof Error ? error.message : 'Failed to verify payment',
        });
    }
    finally {
        client.release();
    }
});
/**
 * GET /api/payment/solana/transactions
 * Get user's Solana transaction history
 */
router.get('/solana/transactions', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await database_1.default.query(`SELECT 
        signature,
        amount_usdc,
        from_address,
        to_address,
        purpose,
        verified_at,
        created_at
       FROM solana_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        res.json({
            transactions: result.rows,
            count: result.rows.length,
            limit,
            offset,
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        });
    }
});
exports.default = router;
//# sourceMappingURL=payment.routes.js.map