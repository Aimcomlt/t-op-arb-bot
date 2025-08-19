export declare function applySlippage(quote: bigint, slippageBps: number): bigint;
export declare function compoundedMinOut(quotes: bigint[], slippageBps: number): bigint;
/**
 * Calculates the slippage in basis points between an expected quote and the
 * actual amount received. Positive values indicate the actual amount was less
 * than expected (worse execution), while negative values indicate a better
 * than expected fill.
 */
export declare function analyzeSlippage(expected: bigint | number, actual: bigint | number): number;
//# sourceMappingURL=slippage.d.ts.map