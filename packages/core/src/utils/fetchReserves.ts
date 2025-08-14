// packages/core/src/utils/fetchReserves.ts
import { publicClient } from '@/clients/viemClient.js';
import { PAIR_ABI } from '@/abis/pair.js';

// Cache reserves keyed by block key (bigint or 'latest') then pool address
type BlockKey = bigint | 'latest';

const reserveCache = new Map<BlockKey, Map<`0x${string}`, ResTuple>>();

function getBlockKey(blockNumber?: bigint): BlockKey {
  return blockNumber ?? 'latest';
}

/** Normalize a multicall entry into [reserve0, reserve1] */
type ReservesTuple = readonly [bigint, bigint, bigint];           // [r0, r1, ts]
type ReservesTupleLoose = readonly [bigint, bigint, number | bigint];
type ResTuple = readonly [bigint, bigint];

function isReservesTupleLoose(x: unknown): x is ReservesTupleLoose {
  return (
    Array.isArray(x) &&
    x.length >= 3 &&
    typeof x[0] === 'bigint' &&
    typeof x[1] === 'bigint' &&
    (typeof x[2] === 'bigint' || typeof x[2] === 'number')
  );
}

function hasResultReservesTupleLoose(obj: unknown): obj is { result: ReservesTupleLoose } {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'result' in (obj as any) &&
    isReservesTupleLoose((obj as any).result)
  );
}

/** Normalize a multicall entry into [reserve0, reserve1] */
function toPairReserves(entry: unknown): ResTuple {
  // Shape A: raw tuple (common when allowFailure=false in viem v2)
  if (isReservesTupleLoose(entry)) {
    // If you ever need the timestamp as bigint:
    // const ts = typeof entry[2] === 'number' ? BigInt(entry[2]) : entry[2];
    return [entry[0], entry[1]] as const;
  }
  // Shape B: object with { result: [r0, r1, ts] } (when allowFailure=true or wrappers)
  if (hasResultReservesTupleLoose(entry)) {
    const r = entry.result;
    // const ts = typeof r[2] === 'number' ? BigInt(r[2]) : r[2];
    return [r[0], r[1]] as const;
  }
  throw new Error('Unexpected multicall result shape for getReserves');
}


/**
 * Batch fetch reserves for multiple UniswapV2/SushiV2-like pairs.
 * - viem v2 compliant (uses multicall)
 * - Optional blockNumber for deterministic reads (and caching)
 * - Returns address -> [reserve0, reserve1]
 */
export async function fetchReserves(
  pools: readonly `0x${string}`[],
  opts: { blockNumber?: bigint } = {}
): Promise<Record<`0x${string}`, ResTuple>> {
  const blockKey = getBlockKey(opts.blockNumber);

  let blockCache = reserveCache.get(blockKey);
  if (!blockCache) {
    blockCache = new Map();
    reserveCache.set(blockKey, blockCache);
  }

  // Only query pools not present in the cache for this block
  const missing = pools.filter((p) => !blockCache!.has(p));
  if (missing.length > 0) {
    const results = await publicClient.multicall({
      blockNumber: opts.blockNumber,
      allowFailure: false, // returns array entries (often raw tuples)
      contracts: missing.map((address) => ({
        address,
        abi: PAIR_ABI,
        functionName: 'getReserves' as const,
      })),
    });

    for (let i = 0; i < missing.length; i++) {
      const reserves = toPairReserves(results[i]);
      blockCache!.set(missing[i], reserves);
    }
  }

  // Build output map from cache
  const out: Record<`0x${string}`, ResTuple> = {} as any;
  for (const addr of pools) {
    const item = blockCache!.get(addr);
    if (item) out[addr] = item;
  }
  return out;
}

/** Clear the entire reserve cache (all blocks). */
export function clearReserveCache() {
  reserveCache.clear();
}
