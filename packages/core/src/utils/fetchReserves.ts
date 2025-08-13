import { viemClient } from '../clients/viemClient.js';
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
    const contracts = missing.map((address) => ({
      address,
      abi: UNISWAP_PAIR_ABI,
      functionName: 'getReserves' as const,
    }));
    const results = await viemClient.multicall({
      contracts,
      blockNumber,
      allowFailure: true,
    });
    missing.forEach((addr, i) => {
      const res = results[i];
      if (res && res.result) {
        const [r0, r1] = res.result as readonly [bigint, bigint, bigint];
        blockCache!.set(addr, [r0, r1]);
      } else {
        blockCache!.set(addr, [0n, 0n]);
      }
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
