import { describe, it, expect, vi } from 'vitest';
import { OpportunityStore } from './opportunityStore.js';

describe('OpportunityStore', () => {
  it('evicts lowest scored entries when capacity exceeded', () => {
    const store = new OpportunityStore({ ttlMs: 1000, cap: 2 });
    store.upsert('A', 1, 1); // score=1
    store.upsert('B', 2, 1); // score=2
    store.upsert('C', 3, 1); // score=3 -> evicts A
    const pairs = store.snapshot().map((e) => e.pairSymbol).sort();
    expect(pairs).toEqual(['B', 'C']);
  });

  it('removes entries past TTL', () => {
    vi.useFakeTimers();
    const store = new OpportunityStore({ ttlMs: 1000, cap: 5 });
    store.upsert('A', 1, 1);
    expect(store.size()).toBe(1);
    vi.advanceTimersByTime(1001);
    store.prune();
    expect(store.size()).toBe(0);
    vi.useRealTimers();
  });
});
