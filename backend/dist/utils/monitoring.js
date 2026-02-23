"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseStats = getDatabaseStats;
const database_1 = __importDefault(require("../config/database"));
async function getDatabaseStats() {
    const result = await database_1.default.query(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as users_24h,
      (SELECT COUNT(*) FROM transactions) as total_transactions,
      (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours') as transactions_24h,
      (SELECT SUM(balance_cents) FROM balances) as total_balance_cents,
      (SELECT COUNT(*) FROM api_usage WHERE created_at > NOW() - INTERVAL '24 hours') as api_calls_24h
  `);
    return result.rows[0];
}
//# sourceMappingURL=monitoring.js.map