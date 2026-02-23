/**
 * Pricing utilities for calculating charges based on mode and prompt length
 *
 * Balance and charges use "millidollars" (1 unit = $0.001) so minimum charge is $0.001.
 * Database balance_cents column stores this unit (1000 = $1). Display: balance_cents / 1000 = USD.
 */
export type ChatMode = 'simple' | 'max' | 'data-analytics-simple' | 'data-analytics-max' | 'code-simple' | 'code-max' | 'deep-research-simple' | 'deep-research-max';
/** Units per USD: 1000 = $0.001 minimum. Use for display: value / UNITS_PER_USD = USD */
export declare const UNITS_PER_USD = 1000;
/**
 * Calculate charge in millidollars (1 = $0.001) for a given mode and user message
 *
 * Reasoning simple: $0.02
 * Reasoning MAX: (unchanged variable)
 * Data simple: $0.005
 * Data MAX: $0.052
 * Code simple: $0.015
 */
export declare function calculateChargeCents(mode: ChatMode, userMessage: string): number;
//# sourceMappingURL=pricing.d.ts.map