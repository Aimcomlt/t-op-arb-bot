import type { PairDescriptor } from './types';
import { canonicalTokenKey } from './types';

// Returns only pairs that exist on BOTH DEXes with the same token ordering (by address).
export function matchUniswapSushi(
  uni: PairDescriptor[],
  sushi: PairDescriptor[]
): Array<{
  pairSymbol: string;
  uniswapLP: `0x${string}`;
  sushiswapLP: `0x${string}`;
  token0: { address: `0x${string}`; symbol: string; decimals: number };
  token1: { address: `0x${string}`; symbol: string; decimals: number };
}> {
  const map = new Map<string, { uni?: PairDescriptor; sushi?: PairDescriptor }>();

  for (const p of uni) {
    const key = canonicalTokenKey(p.token0, p.token1);
    const cur = map.get(key) ?? {};
    cur.uni = p;
    map.set(key, cur);
  }
  for (const p of sushi) {
    const key = canonicalTokenKey(p.token0, p.token1);
    const cur = map.get(key) ?? {};
    cur.sushi = p;
    map.set(key, cur);
  }

  const matched: Array<ReturnType<typeof normalizeOut>> = [];
  for (const [, v] of map) {
    if (v.uni && v.sushi) {
      matched.push(
        normalizeOut(v.uni, v.sushi)
      );
    }
  }
  return matched;
}

function normalizeOut(uni: PairDescriptor, sushi: PairDescriptor) {
  // Use symbol order from token addresses (stable key) to build a consistent label
  const pairSymbol = `${uni.token0.symbol}/${uni.token1.symbol}`;
  return {
    pairSymbol,
    uniswapLP: uni.lpAddress,
    sushiswapLP: sushi.lpAddress,
    token0: uni.token0,
    token1: uni.token1,
  } as const;
}
