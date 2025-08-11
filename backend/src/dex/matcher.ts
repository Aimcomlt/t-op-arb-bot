import type { PairDescriptor, Token } from './types.js';
import { env } from '../config/env.js';
import { readFileSync } from 'fs';

const WETH: Token = {
  address: env.WETH_ADDRESS as `0x${string}`,
  symbol: 'WETH',
  decimals: 18,
};

const allowSet = new Set(env.QUOTE_ALLOWLIST.map((a) => a.toLowerCase()));
const denySet = new Set(env.QUOTE_DENYLIST.map((a) => a.toLowerCase()));
let seedSet = new Set<string>();
if (env.LP_SEED_JSON) {
  try {
    const data = JSON.parse(readFileSync(env.LP_SEED_JSON, 'utf-8')) as string[];
    if (Array.isArray(data)) {
      seedSet = new Set(data.map((a) => a.toLowerCase()));
    }
  } catch {
    /* ignore seed load errors */
  }
}

// Given a PairDescriptor, return the non-WETH token address (quote token)
function quoteTokenAddress(p: PairDescriptor): `0x${string}` {
  const weth = env.WETH_ADDRESS.toLowerCase();
  if (p.token0.address.toLowerCase() === weth) return p.token1.address;
  if (p.token1.address.toLowerCase() === weth) return p.token0.address;
  throw new Error('pair missing WETH');
}

// Returns only WETH pairs that exist on BOTH DEXes. Matching is done by the
// non-WETH (quote) token address.
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
  const uniMap = new Map<string, PairDescriptor>();
  const sushiMap = new Map<string, PairDescriptor>();

  for (const p of uni) {
    const key = quoteTokenAddress(p).toLowerCase();
    uniMap.set(key, p);
  }
  for (const p of sushi) {
    const key = quoteTokenAddress(p).toLowerCase();
    sushiMap.set(key, p);
  }

  const matched: Array<ReturnType<typeof normalizeOut>> = [];
  for (const [key, sushiPair] of sushiMap) {
    if (denySet.has(key)) continue;
    if (allowSet.size > 0 && !allowSet.has(key)) continue;
    if (seedSet.size > 0 && !seedSet.has(key)) continue;
    const uniPair = uniMap.get(key);
    if (uniPair) matched.push(normalizeOut(uniPair, sushiPair));
  }
  return matched;
}

function normalizeOut(uni: PairDescriptor, sushi: PairDescriptor) {
  const quoteToken =
    uni.token0.address.toLowerCase() === env.WETH_ADDRESS.toLowerCase()
      ? uni.token1
      : uni.token0;
  const pairSymbol = `${quoteToken.symbol}/WETH`;
  return {
    pairSymbol,
    uniswapLP: uni.lpAddress,
    sushiswapLP: sushi.lpAddress,
    token0: quoteToken,
    token1: WETH,
  } as const;
}
