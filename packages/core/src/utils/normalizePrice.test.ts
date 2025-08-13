import { describe, it, expect } from 'vitest';
import { normalizePrice } from './normalizePrice.js';

describe('normalizePrice', () => {
  it('divides amount by 10^decimals', () => {
    expect(normalizePrice(123456n, 3)).toBe(123.456);
  });

  it('handles numeric input', () => {
    expect(normalizePrice(1000, 2)).toBe(10);
  });
});
