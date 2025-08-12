import type { ArbStrategy } from '../../types/strategyTypes.js';

export function withPermit2<T extends ArbStrategy>(strategy: T): T {
  return strategy;
}
