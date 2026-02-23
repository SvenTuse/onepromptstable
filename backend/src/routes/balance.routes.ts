import { Router, Response } from 'express';
import { BalanceService } from '../services/balance.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { UNITS_PER_USD } from '../utils/pricing';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const balance = await BalanceService.getBalance(req.user!.userId);
    res.json({
      balance_cents: balance.balance_cents,
      balance_usd: balance.balance_cents / UNITS_PER_USD,
      locked_cents: balance.locked_cents,
      available_cents: balance.balance_cents - balance.locked_cents,
      available_usd: (balance.balance_cents - balance.locked_cents) / UNITS_PER_USD,
      currency: balance.currency,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

router.post('/deposit', requireRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid deposit data' });
      return;
    }

    const amountCents = Math.round(amount * UNITS_PER_USD);

    const transaction = await BalanceService.deposit(
      userId,
      amountCents,
      description || 'Manual deposit by admin'
    );

    res.json({
      message: 'Deposit successful',
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount_cents: transaction.amount_cents,
        amount_usd: transaction.amount_cents / UNITS_PER_USD,
        balance_after_cents: transaction.balance_after_cents,
        balance_after_usd: transaction.balance_after_cents / UNITS_PER_USD,
      },
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await BalanceService.getTransactionHistory(
      req.user!.userId,
      limit,
      offset
    );

    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount_cents: t.amount_cents,
        amount_usd: t.amount_cents / UNITS_PER_USD,
        balance_before_usd: t.balance_before_cents / UNITS_PER_USD,
        balance_after_usd: t.balance_after_cents / UNITS_PER_USD,
        description: t.description,
        created_at: t.created_at,
      })),
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.get('/usage-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const stats = await BalanceService.getUsageStats(req.user!.userId, days);

    res.json({ stats });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

export default router;

