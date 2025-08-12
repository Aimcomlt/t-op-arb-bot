import type { ArbStrategy } from '../../types/strategyTypes.js';

export function withFlashloan<T extends ArbStrategy>(strategy: T): T {
  return strategy;
}
