"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceService = void 0;
const database_1 = __importDefault(require("../config/database"));
const uuid_1 = require("uuid");
class BalanceService {
    static async getBalance(userId) {
        const result = await database_1.default.query('SELECT balance_cents, locked_cents, currency FROM balances WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('Balance not found');
        }
        return result.rows[0];
    }
    static async deposit(userId, amountCents, description = 'Deposit', metadata) {
        const idempotencyKey = (0, uuid_1.v4)();
        const result = await database_1.default.query(`SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`, [userId, 'deposit', amountCents, description, JSON.stringify(metadata), idempotencyKey]);
        const transactionId = result.rows[0].transaction_id;
        return this.getTransaction(transactionId);
    }
    static async charge(userId, amountCents, description = 'API usage', metadata, idempotencyKey) {
        const key = idempotencyKey || (0, uuid_1.v4)();
        try {
            const result = await database_1.default.query(`SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`, [userId, 'usage', -amountCents, description, JSON.stringify(metadata), key]);
            const transactionId = result.rows[0].transaction_id;
            return this.getTransaction(transactionId);
        }
        catch (error) {
            if (error.message && error.message.includes('Insufficient balance')) {
                throw new Error('Insufficient balance');
            }
            throw error;
        }
    }
    static async refund(userId, amountCents, description = 'Refund', metadata) {
        const idempotencyKey = (0, uuid_1.v4)();
        const result = await database_1.default.query(`SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`, [userId, 'refund', amountCents, description, JSON.stringify(metadata), idempotencyKey]);
        const transactionId = result.rows[0].transaction_id;
        return this.getTransaction(transactionId);
    }
    static async bonus(userId, amountCents, description = 'Bonus', metadata) {
        const idempotencyKey = (0, uuid_1.v4)();
        const result = await database_1.default.query(`SELECT process_transaction($1, $2, $3, $4, $5, $6) as transaction_id`, [userId, 'bonus', amountCents, description, JSON.stringify(metadata), idempotencyKey]);
        const transactionId = result.rows[0].transaction_id;
        return this.getTransaction(transactionId);
    }
    static async getTransactionHistory(userId, limit = 50, offset = 0) {
        const result = await database_1.default.query(`SELECT 
        id, type, amount_cents, balance_before_cents, balance_after_cents,
        description, created_at, metadata, status
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return result.rows;
    }
    static async logApiUsage(userId, transactionId, model, tokensUsed, costCents, metadata) {
        await database_1.default.query(`INSERT INTO api_usage (user_id, transaction_id, model, tokens_used, cost_cents, request_metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`, [userId, transactionId, model, tokensUsed, costCents, JSON.stringify(metadata)]);
    }
    static async getUsageStats(userId, days = 30) {
        const result = await database_1.default.query(`SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as request_count,
        SUM(tokens_used) as total_tokens,
        SUM(cost_cents) as total_cost_cents,
        jsonb_object_agg(model, COUNT(*)) as models_used
       FROM api_usage
       WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC`, [userId]);
        return result.rows;
    }
    static async getTransaction(transactionId) {
        const result = await database_1.default.query(`SELECT id, type, amount_cents, balance_before_cents, balance_after_cents,
              description, created_at
       FROM transactions
       WHERE id = $1`, [transactionId]);
        if (result.rows.length === 0) {
            throw new Error('Transaction not found');
        }
        return result.rows[0];
    }
}
exports.BalanceService = BalanceService;
//# sourceMappingURL=balance.service.js.map