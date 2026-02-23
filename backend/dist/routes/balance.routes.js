"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const balance_service_1 = require("../services/balance.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const pricing_1 = require("../utils/pricing");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const balance = await balance_service_1.BalanceService.getBalance(req.user.userId);
        res.json({
            balance_cents: balance.balance_cents,
            balance_usd: balance.balance_cents / pricing_1.UNITS_PER_USD,
            locked_cents: balance.locked_cents,
            available_cents: balance.balance_cents - balance.locked_cents,
            available_usd: (balance.balance_cents - balance.locked_cents) / pricing_1.UNITS_PER_USD,
            currency: balance.currency,
        });
    }
    catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});
router.post('/deposit', (0, auth_middleware_1.requireRole)('admin'), async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        if (!userId || !amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid deposit data' });
            return;
        }
        const amountCents = Math.round(amount * pricing_1.UNITS_PER_USD);
        const transaction = await balance_service_1.BalanceService.deposit(userId, amountCents, description || 'Manual deposit by admin');
        res.json({
            message: 'Deposit successful',
            transaction: {
                id: transaction.id,
                type: transaction.type,
                amount_cents: transaction.amount_cents,
                amount_usd: transaction.amount_cents / pricing_1.UNITS_PER_USD,
                balance_after_cents: transaction.balance_after_cents,
                balance_after_usd: transaction.balance_after_cents / pricing_1.UNITS_PER_USD,
            },
        });
    }
    catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Deposit failed' });
    }
});
router.get('/transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const transactions = await balance_service_1.BalanceService.getTransactionHistory(req.user.userId, limit, offset);
        res.json({
            transactions: transactions.map((t) => ({
                id: t.id,
                type: t.type,
                amount_cents: t.amount_cents,
                amount_usd: t.amount_cents / pricing_1.UNITS_PER_USD,
                balance_before_usd: t.balance_before_cents / pricing_1.UNITS_PER_USD,
                balance_after_usd: t.balance_after_cents / pricing_1.UNITS_PER_USD,
                description: t.description,
                created_at: t.created_at,
            })),
            pagination: {
                limit,
                offset,
                hasMore: transactions.length === limit,
            },
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});
router.get('/usage-stats', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const stats = await balance_service_1.BalanceService.getUsageStats(req.user.userId, days);
        res.json({ stats });
    }
    catch (error) {
        console.error('Get usage stats error:', error);
        res.status(500).json({ error: 'Failed to get usage stats' });
    }
});
exports.default = router;
//# sourceMappingURL=balance.routes.js.map