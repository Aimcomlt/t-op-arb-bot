import { describe, it, expect } from 'vitest';
import { analyzeSlippage } from './slippage.js';

describe('analyzeSlippage', () => {
  it('returns positive bps when actual is lower than expected', () => {
    expect(analyzeSlippage(100n, 90n)).toBeCloseTo(1000);
  });

  it('returns negative bps when actual is higher than expected', () => {
    expect(analyzeSlippage(100n, 110n)).toBeCloseTo(-1000);
  });

  it('returns 0 when expected is 0', () => {
    expect(analyzeSlippage(0n, 0n)).toBe(0);
  });
});
