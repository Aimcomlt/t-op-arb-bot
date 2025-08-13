import { describe, it, expect } from 'vitest';
import { computeSpreadBps } from './computeSpread.js';

describe('computeSpreadBps', () => {
  it('computes basis point difference irrespective of order', () => {
    expect(computeSpreadBps(100, 110)).toBeCloseTo(1000);
    expect(computeSpreadBps(110, 100)).toBeCloseTo(1000);
  });

  it('returns 0 when prices are equal', () => {
    expect(computeSpreadBps(100, 100)).toBe(0);
  });
});
