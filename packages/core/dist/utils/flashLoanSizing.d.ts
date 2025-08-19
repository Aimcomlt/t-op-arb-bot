export interface ConstantProductPool {
    reserveIn: bigint;
    reserveOut: bigint;
}
interface FlashLoanSizingParams {
    buyPool: ConstantProductPool;
    sellPool: ConstantProductPool;
    maxSlippageBps: number;
}
/**
 * Computes the maximum flash loan size (in terms of the input token) that
 * can be traded across two constant-product pools while keeping the price
 * impact on each pool within `maxSlippageBps` basis points.
 *
 * This uses a binary search on the input amount to avoid floating point
 * precision issues when operating on large integer reserves.
 */
export declare function computeSafeFlashLoanSize({ buyPool, sellPool, maxSlippageBps, }: FlashLoanSizingParams): bigint;
export {};
//# sourceMappingURL=flashLoanSizing.d.ts.map