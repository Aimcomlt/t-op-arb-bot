import { describe, it, expect } from 'vitest';
import { profitGuard } from './profitGuard.js';

describe('profitGuard', () => {
  it('returns true when proceeds exceed costs and buffer', () => {
    const params = { expectedProceeds: 1000n, gasCost: 100n, flashFee: 50n, mevBufferBps: 100 };
    expect(profitGuard(params)).toBe(true);
  });

  it('returns false when proceeds are insufficient', () => {
    const params = { expectedProceeds: 100n, gasCost: 100n, flashFee: 50n };
    expect(profitGuard(params)).toBe(false);
  });
});
