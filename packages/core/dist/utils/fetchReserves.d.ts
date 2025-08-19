type ResTuple = readonly [bigint, bigint];
/**
 * Batch fetch reserves for multiple UniswapV2/SushiV2-like pairs.
 * - viem v2 compliant (uses multicall)
 * - Optional blockNumber for deterministic reads (and caching)
 * - Returns address -> [reserve0, reserve1]
 */
export declare function fetchReserves(pools: readonly `0x${string}`[], opts?: {
    blockNumber?: bigint;
}): Promise<Record<`0x${string}`, ResTuple>>;
/** Clear the entire reserve cache (all blocks). */
export declare function clearReserveCache(): void;
export {};
//# sourceMappingURL=fetchReserves.d.ts.map