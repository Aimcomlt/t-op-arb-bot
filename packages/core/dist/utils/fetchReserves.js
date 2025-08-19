// packages/core/src/utils/fetchReserves.ts
import { publicClient } from '@/clients/viemClient.js';
import { PAIR_ABI } from '@/abis/pair.js';
const reserveCache = new Map();
function getBlockKey(blockNumber) {
    return blockNumber ?? 'latest';
}
function isReservesTupleLoose(x) {
    return (Array.isArray(x) &&
        x.length >= 3 &&
        typeof x[0] === 'bigint' &&
        typeof x[1] === 'bigint' &&
        (typeof x[2] === 'bigint' || typeof x[2] === 'number'));
}
function hasResultReservesTupleLoose(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'result' in obj &&
        isReservesTupleLoose(obj.result));
}
/** Normalize a multicall entry into [reserve0, reserve1] */
function toPairReserves(entry) {
    // Shape A: raw tuple (common when allowFailure=false in viem v2)
    if (isReservesTupleLoose(entry)) {
        // If you ever need the timestamp as bigint:
        // const ts = typeof entry[2] === 'number' ? BigInt(entry[2]) : entry[2];
        return [entry[0], entry[1]];
    }
    // Shape B: object with { result: [r0, r1, ts] } (when allowFailure=true or wrappers)
    if (hasResultReservesTupleLoose(entry)) {
        const r = entry.result;
        // const ts = typeof r[2] === 'number' ? BigInt(r[2]) : r[2];
        return [r[0], r[1]];
    }
    throw new Error('Unexpected multicall result shape for getReserves');
}
/**
 * Batch fetch reserves for multiple UniswapV2/SushiV2-like pairs.
 * - viem v2 compliant (uses multicall)
 * - Optional blockNumber for deterministic reads (and caching)
 * - Returns address -> [reserve0, reserve1]
 */
export async function fetchReserves(pools, opts = {}) {
    const blockKey = getBlockKey(opts.blockNumber);
    let blockCache = reserveCache.get(blockKey);
    if (!blockCache) {
        blockCache = new Map();
        reserveCache.set(blockKey, blockCache);
    }
    // Only query pools not present in the cache for this block
    const missing = pools.filter((p) => !blockCache.has(p));
    if (missing.length > 0) {
        const results = await publicClient.multicall({
            blockNumber: opts.blockNumber,
            allowFailure: false, // returns array entries (often raw tuples)
            contracts: missing.map((address) => ({
                address,
                abi: PAIR_ABI,
                functionName: 'getReserves',
            })),
        });
        for (let i = 0; i < missing.length; i++) {
            const reserves = toPairReserves(results[i]);
            blockCache.set(missing[i], reserves);
        }
    }
    // Build output map from cache
    const out = {};
    for (const addr of pools) {
        const item = blockCache.get(addr);
        if (item)
            out[addr] = item;
    }
    return out;
}
/** Clear the entire reserve cache (all blocks). */
export function clearReserveCache() {
    reserveCache.clear();
}
