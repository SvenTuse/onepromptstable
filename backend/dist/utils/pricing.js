"use strict";
/**
 * Pricing utilities for calculating charges based on mode and prompt length
 *
 * Balance and charges use "millidollars" (1 unit = $0.001) so minimum charge is $0.001.
 * Database balance_cents column stores this unit (1000 = $1). Display: balance_cents / 1000 = USD.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNITS_PER_USD = void 0;
exports.calculateChargeCents = calculateChargeCents;
/** Units per USD: 1000 = $0.001 minimum. Use for display: value / UNITS_PER_USD = USD */
exports.UNITS_PER_USD = 1000;
/**
 * Calculate charge in millidollars (1 = $0.001) for a given mode and user message
 *
 * Reasoning simple: $0.02
 * Reasoning MAX: (unchanged variable)
 * Data simple: $0.005
 * Data MAX: $0.052
 * Code simple: $0.015
 */
function calculateChargeCents(mode, userMessage) {
    const wordCount = userMessage.trim().split(/\s+/).filter(Boolean).length || 0;
    const groups = Math.ceil(wordCount / 10);
    switch (mode) {
        case 'simple': {
            const total = 0.02;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'max': {
            const total = 2.34 + groups * 0.0015;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'data-analytics-simple': {
            const total = 0.005 + groups * 0.00005;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'data-analytics-max': {
            const total = 0.052;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'code-simple': {
            const total = 0.015;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'code-max': {
            const total = 0.274 + groups * 0.000002;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'deep-research-simple': {
            const total = 0.005 + groups * 0.00005;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
        case 'deep-research-max': {
            const total = 0.012 + groups * 0.0001;
            return Math.max(1, Math.round(total * exports.UNITS_PER_USD));
        }
    }
}
//# sourceMappingURL=pricing.js.map