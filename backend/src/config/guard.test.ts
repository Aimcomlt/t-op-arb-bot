import { describe, expect, it } from 'vitest';
import { guardConfig, withinGuard, SimulationResult } from './guard.js';

describe('withinGuard', () => {
  const base: SimulationResult = {
    pair: 'WETH/USDC',
    gasUsed: 100_000n,
    priceImpactBps: 10,
    expectedProfit: 1,
  };

  it('passes when all thresholds are met', () => {
    expect(withinGuard(base)).toBe(true);
  });

  it('fails if pair not whitelisted', () => {
    const sim = { ...base, pair: 'FOO/BAR' };
    expect(withinGuard(sim)).toBe(false);
  });

  it('fails if gas exceeds max', () => {
    const sim = { ...base, gasUsed: guardConfig.maxGas + 1n };
    expect(withinGuard(sim)).toBe(false);
  });

  it('fails if slippage exceeds max', () => {
    const sim = { ...base, priceImpactBps: guardConfig.maxSlippageBps + 1 };
    expect(withinGuard(sim)).toBe(false);
  });

  it('fails if profit below floor', () => {
    const sim = { ...base, expectedProfit: guardConfig.profitFloor - 0.001 };
    expect(withinGuard(sim)).toBe(false);
  });
});
