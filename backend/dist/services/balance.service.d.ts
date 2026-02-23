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
export declare class BalanceService {
    static getBalance(userId: string): Promise<Balance>;
    static deposit(userId: string, amountCents: number, description?: string, metadata?: any): Promise<Transaction>;
    static charge(userId: string, amountCents: number, description?: string, metadata?: any, idempotencyKey?: string): Promise<Transaction>;
    static refund(userId: string, amountCents: number, description?: string, metadata?: any): Promise<Transaction>;
    static bonus(userId: string, amountCents: number, description?: string, metadata?: any): Promise<Transaction>;
    static getTransactionHistory(userId: string, limit?: number, offset?: number): Promise<Transaction[]>;
    static logApiUsage(userId: string, transactionId: string, model: string, tokensUsed: number, costCents: number, metadata?: any): Promise<void>;
    static getUsageStats(userId: string, days?: number): Promise<any[]>;
    private static getTransaction;
}
export {};
//# sourceMappingURL=balance.service.d.ts.map