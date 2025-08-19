/**
 * Collects LP pair data from supported DEXs (Uniswap, SushiSwap, etc.)
 * and returns them in a normalized structure.
 *
 * This module is foundational for building arbitrage paths.
 * It is designed for modular expansion (Balancer, Curve, Solidly, etc.)
 */
export interface RawLP {
    token0: string;
    token1: string;
    pairAddress: string;
    dex: string;
}
/**
 * Collect LP pairs from all supported DEX sources.
 */
export declare function collectPairs(): Promise<RawLP[]>;
//# sourceMappingURL=dexCollector.d.ts.map