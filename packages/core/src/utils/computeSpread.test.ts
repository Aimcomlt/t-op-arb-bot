import { describe, it, expect } from 'vitest';
import { computeSpread } from './computeSpread.js';

describe('computeSpread', () => {
  it('is symmetric regardless of input order', () => {
    const a = { dex: 'dexA', price: 100 };
    const b = { dex: 'dexB', price: 110 };
    const r1 = computeSpread(a, b);
    const r2 = computeSpread(b, a);
    expect(r1).toEqual(r2);
    expect(r1).toMatchInlineSnapshot(`
      {
        "buyDex": "dexA",
        "sellDex": "dexB",
        "spreadBps": 1000,
      }
    `);
  });
});
