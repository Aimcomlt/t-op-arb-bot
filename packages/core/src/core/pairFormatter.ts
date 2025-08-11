// src/core/pairFormatter.ts

/**
 * Normalizes LP pairs by ensuring consistent token ordering (lexicographically)
 * and removes duplicates from multiple DEXs or redundant listings.
 */

import { RawLP } from '../dex/dexCollector.js';

export interface CanonicalPair {
  tokenA: string;
  tokenB: string;
  pairAddress: string;
  dex: string;
  key: string; // tokenA_tokenB
}

/**
 * Sorts token addresses and constructs a canonical identifier
 */
function canonicalize(token0: string, token1: string): [string, string] {
  return [token0.toLowerCase(), token1.toLowerCase()].sort() as [string, string];
}

/**
 * Formats and deduplicates raw LP data into canonical pairs
 */
export function normalizePairs(pairs: RawLP[]): CanonicalPair[] {
  const seen = new Set<string>();
  const canonical: CanonicalPair[] = [];

  for (const pair of pairs) {
    const [tokenA, tokenB] = canonicalize(pair.token0, pair.token1);
    const key = `${tokenA}_${tokenB}`;

    if (seen.has(key)) continue;
    seen.add(key);

    canonical.push({
      tokenA,
      tokenB,
      pairAddress: pair.pairAddress,
      dex: pair.dex,
      key,
    });
  }

  return canonical;
}
