import { describe, it, expect } from 'vitest';
import { strategyBuilder } from './strategyBuilder.js';

const baseTrace = { gasCostUSD: 5, rv3Block: 0.1 };
const baseSpread = { estimatedProfit: 10, slippageBps: 50 };
const config = {
  minProfitUSD: 1,
  slippageToleranceBps: 100,
  maxGasUSD: 10,
  maxRv: 1,
};

describe('strategyBuilder guardrails', () => {
  it('allows execution when all guardrails pass', async () => {
    const strat = strategyBuilder(baseTrace, baseSpread, config);
    expect(strat.shouldExecute).toBe(true);
    expect(strat.reason).toBeNull();
    await strat.buildCalldata();
    const res = await strat.dryRun();
    expect(res.status).toBe('success');
  });

  it('fails minProfitUSD', () => {
    const strat = strategyBuilder(baseTrace, { ...baseSpread, estimatedProfit: 0 }, config);
    expect(strat.shouldExecute).toBe(false);
    expect(strat.reason).toBe('minProfitUSD');
  });

  it('fails slippage tolerance', () => {
    const strat = strategyBuilder(baseTrace, { ...baseSpread, slippageBps: 200 }, config);
    expect(strat.shouldExecute).toBe(false);
    expect(strat.reason).toBe('slippageTolerance');
  });

  it('fails gas sensitivity', () => {
    const strat = strategyBuilder({ ...baseTrace, gasCostUSD: 20 }, baseSpread, config);
    expect(strat.shouldExecute).toBe(false);
    expect(strat.reason).toBe('gasSensitivity');
  });

  it('fails rv clamp', () => {
    const strat = strategyBuilder({ ...baseTrace, rv3Block: 5 }, baseSpread, config);
    expect(strat.shouldExecute).toBe(false);
    expect(strat.reason).toBe('rvClamp');
  });

  it('plumbs safeLoanSize into resulting strategy', () => {
    const strat = strategyBuilder(baseTrace, { ...baseSpread, safeLoanSize: 42n }, config);
    expect(strat.safeLoanSize).toBe(42n);
  });
});
