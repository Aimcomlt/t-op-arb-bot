// src/dex/dexCollector.ts

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

import { fetchUniPairs } from './loaders/uniswap';
import { fetchSushiPairs } from './loaders/sushiswap';
// Add other DEX loaders here

/**
 * Collect LP pairs from all supported DEX sources.
 */
export async function collectPairs(): Promise<RawLP[]> {
  const sources = [
    fetchUniPairs(),
    fetchSushiPairs(),
    // Add additional fetchers here
  ];

  const results = await Promise.allSettled(sources);

  const allPairs: RawLP[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allPairs.push(...result.value);
    } else {
      console.warn('[dexCollector] DEX fetch failed:', result.reason);
    }
  }

  return allPairs;
}
