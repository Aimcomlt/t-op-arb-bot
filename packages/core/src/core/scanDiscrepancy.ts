import { computeSpread } from '../utils/computeSpread.js';
import { SpreadComputationResult } from '../types/arbitrageTypes.js';

export interface DexSnapshot {
  pairSymbol: string;
  dex: string;
  reserves: [number, number];
}

export interface ScanOptions {
  minLiquidity?: number;
  thresholdBps?: number;
}

/**
 * Scans a set of DEX snapshots for arbitrage opportunities.
 * Prices are normalized as tokenOut per tokenIn.
 */
export function scanDiscrepancy(
  snapshots: DexSnapshot[],
  opts: ScanOptions = {}
): SpreadComputationResult | null {
  const { minLiquidity = 0, thresholdBps = 0 } = opts;
  if (!snapshots.length) return null;

  const filtered = snapshots.filter(
    (s) => s.reserves[0] >= minLiquidity && s.reserves[1] >= minLiquidity
  );
  if (filtered.length < 2) return null;

  // Compute normalized prices
  const prices = filtered.map((s) => ({
    dex: s.dex,
    price: s.reserves[1] / s.reserves[0],
  }));

  // Find min and max price
  let min = prices[0];
  let max = prices[0];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i].price < min.price) min = prices[i];
    if (prices[i].price > max.price) max = prices[i];
  }
  if (min.dex === max.dex) return null;

  const spread = computeSpread(min, max);
  if (!spread || spread.spreadBps < thresholdBps) return null;

  const [tokenIn, tokenOut] = filtered[0].pairSymbol.split('/');

  return {
    tokenIn,
    tokenOut,
    spread: spread.spreadBps,
    buyOn: spread.buyDex,
    sellOn: spread.sellDex,
    estimatedProfit: 0,
  };
}
