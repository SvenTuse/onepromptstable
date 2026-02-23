import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface Transaction {
  id: string;
  type: string;
  amount_cents: number;
  balance_before_cents: number;
  balance_after_cents: number;
  description: string;
  created_at: Date;
}

interface Balance {
  balance_cents: number;
  locked_cents: number;
  currency: string;
}

export class BalanceService {
  static async getBalance(userId: string): Promise<Balance> {
    const result = await pool.query(
      'SELECT balance_cents, locked_cents, currency FROM balances WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Balance not found');
    }

    return result.rows[0];
  }

  static async deposit(
    userId: string,
    amountCents: number,
    description: string = 'Deposit',
    metadata?: any
  ): Promise<Transaction> {
    const idempotencyKey = uuidv4();

    const result = await pool.query(
      `SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`,
      [userId, 'deposit', amountCents, description, JSON.stringify(metadata), idempotencyKey]
    );

    const transactionId = result.rows[0].transaction_id;

    return this.getTransaction(transactionId);
  }

  static async charge(
    userId: string,
    amountCents: number,
    description: string = 'API usage',
    metadata?: any,
    idempotencyKey?: string
  ): Promise<Transaction> {
    const key = idempotencyKey || uuidv4();

    try {
      const result = await pool.query(
        `SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`,
        [userId, 'usage', -amountCents, description, JSON.stringify(metadata), key]
      );

      const transactionId = result.rows[0].transaction_id;

      return this.getTransaction(transactionId);
    } catch (error: any) {
      if (error.message && error.message.includes('Insufficient balance')) {
        throw new Error('Insufficient balance');
      }
      throw error;
    }
  }

  static async refund(
    userId: string,
    amountCents: number,
    description: string = 'Refund',
    metadata?: any
  ): Promise<Transaction> {
    const idempotencyKey = uuidv4();

    const result = await pool.query(
      `SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`,
      [userId, 'refund', amountCents, description, JSON.stringify(metadata), idempotencyKey]
    );

    const transactionId = result.rows[0].transaction_id;

    return this.getTransaction(transactionId);
  }

  static async bonus(
    userId: string,
    amountCents: number,
    description: string = 'Bonus',
    metadata?: any
  ): Promise<Transaction> {
    const idempotencyKey = uuidv4();

    const result = await pool.query(
      `SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`,
      [userId, 'bonus', amountCents, description, JSON.stringify(metadata), idempotencyKey]
    );

    const transactionId = result.rows[0].transaction_id;

    return this.getTransaction(transactionId);
  }

  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const result = await pool.query(
      `SELECT 
        id, type, amount_cents, balance_before_cents, balance_after_cents,
        description, created_at, metadata, status
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  static async logApiUsage(
    userId: string,
    transactionId: string,
    model: string,
    tokensUsed: number,
    costCents: number,
    metadata?: any
  ): Promise<void> {
    await pool.query(
      `INSERT INTO api_usage (user_id, transaction_id, model, tokens_used, cost_cents, request_metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, transactionId, model, tokensUsed, costCents, JSON.stringify(metadata)]
    );
  }

  static async getUsageStats(userId: string, days: number = 30) {
    const result = await pool.query(
      `SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as request_count,
        SUM(tokens_used) as total_tokens,
        SUM(cost_cents) as total_cost_cents,
        jsonb_object_agg(model, COUNT(*)) as models_used
       FROM api_usage
       WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC`,
      [userId]
    );

    return result.rows;
  }

  private static async getTransaction(transactionId: string): Promise<Transaction> {
    const result = await pool.query(
      `SELECT id, type, amount_cents, balance_before_cents, balance_after_cents,
              description, created_at
       FROM transactions
       WHERE id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    return result.rows[0];
  }
}

