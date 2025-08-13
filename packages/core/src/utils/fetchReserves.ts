import { publicClient } from '../clients/viemClient.js';
import { UNISWAP_PAIR_ABI } from '../abi-cache/PAIR/uniswapV2Pair.js';

// Cache reserves keyed by block number then pool address
const reserveCache = new Map<bigint, Map<string, [bigint, bigint]>>();

export async function fetchReserves(
  pools: string[],
  blockNumber: bigint
): Promise<Record<string, [bigint, bigint]>> {
  let blockCache = reserveCache.get(blockNumber);
  if (!blockCache) {
    blockCache = new Map();
    reserveCache.set(blockNumber, blockCache);
  }

  const missing = pools.filter((p) => !blockCache!.has(p));
  if (missing.length > 0) {
    const results = await publicClient.readContracts({
      allowFailure: false,
      blockNumber,
      contracts: missing.map((address) => ({
        address,
        abi: UNISWAP_PAIR_ABI,
        functionName: 'getReserves' as const,
      })),
    });
    missing.forEach((addr, i) => {
      const item = results[i] as
        | readonly [bigint, bigint, bigint]
        | readonly [readonly [bigint, bigint, bigint], unknown, unknown];
      const reserves = Array.isArray(item[0])
        ? (item[0] as readonly [bigint, bigint, bigint])
        : (item as readonly [bigint, bigint, bigint]);
      const [r0, r1] = reserves;
      blockCache!.set(addr, [r0, r1]);
    });
  }

  const out: Record<string, [bigint, bigint]> = {};
  for (const addr of pools) {
    const item = blockCache!.get(addr);
    if (item) out[addr] = item;
  }
  return out;
}

export function clearReserveCache() {
  reserveCache.clear();
}
