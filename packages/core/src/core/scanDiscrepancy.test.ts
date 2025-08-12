import { describe, it, expect } from 'vitest';
import { scanDiscrepancy } from './scanDiscrepancy.js';

describe('scanDiscrepancy', () => {
  it('applies threshold and determines buy/sell legs', () => {
    const snaps = [
      { pairSymbol: 'ETH/USDC', dex: 'uni', reserves: [100, 100000] },
      { pairSymbol: 'ETH/USDC', dex: 'sushi', reserves: [100, 110000] },
    ];
    const res = scanDiscrepancy(snaps, { thresholdBps: 50, minLiquidity: 50 });
    expect(res).toMatchInlineSnapshot(`
      {
        "buyOn": "uni",
        "estimatedProfit": 0,
        "sellOn": "sushi",
        "spread": 1000,
        "tokenIn": "ETH",
        "tokenOut": "USDC",
      }
    `);
  });

  it('returns null when below threshold', () => {
    const snaps = [
      { pairSymbol: 'ETH/USDC', dex: 'uni', reserves: [100, 100000] },
      { pairSymbol: 'ETH/USDC', dex: 'sushi', reserves: [100, 100100] },
    ];
    expect(
      scanDiscrepancy(snaps, { thresholdBps: 50, minLiquidity: 50 })
    ).toMatchInlineSnapshot('null');
  });

  it('filters out low liquidity pools', () => {
    const snaps = [
      { pairSymbol: 'ETH/USDC', dex: 'uni', reserves: [1, 10] },
      { pairSymbol: 'ETH/USDC', dex: 'sushi', reserves: [100, 110000] },
    ];
    expect(
      scanDiscrepancy(snaps, { thresholdBps: 50, minLiquidity: 50 })
    ).toBeNull();
  });

  it('processes 10k snapshots under 100ms', () => {
    const snaps = Array.from({ length: 10000 }, (_, i) => ({
      pairSymbol: 'ETH/USDC',
      dex: `dex${i}`,
      reserves: [100 + i, 100000 + i],
    }));
    const start = performance.now();
    scanDiscrepancy(snaps);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
