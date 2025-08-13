import type { ArbStrategy } from '../../types/strategyTypes.js';

export function withFlashloan<T extends ArbStrategy>(strategy: T, amount?: bigint): T {
  if (typeof amount === 'bigint') {
    strategy.safeLoanSize = amount;
  }
  return strategy;
}
