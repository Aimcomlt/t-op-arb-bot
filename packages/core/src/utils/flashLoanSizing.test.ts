import { describe, it, expect } from 'vitest';
import { computeSafeFlashLoanSize } from './flashLoanSizing.js';

describe('computeSafeFlashLoanSize', () => {
  it('caps input based on slippage across both pools', () => {
    const size = computeSafeFlashLoanSize({
      buyPool: { reserveIn: 1000n, reserveOut: 1000n },
      sellPool: { reserveIn: 1000n, reserveOut: 1000n },
      maxSlippageBps: 100,
    });
    expect(size).toBe(5n);
  });
});

