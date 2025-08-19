// src/state/wsStore.ts
type PairRow = { pair: string; spreadBps: number; liqUSD: number /* … */ };

type Snapshot = Readonly<{
  pairs: readonly PairRow[];  // immutable snapshot
}>;

let snapshot: Snapshot = Object.freeze({ pairs: Object.freeze([]) });
const listeners = new Set<() => void>();

export function getSnapshot(): Snapshot {
  return snapshot; // ← stable reference between updates
}
export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Call this ONLY when data changes
export function updatePairs(next: PairRow[]): void {
  // optional: shallow equality to avoid spurious re-renders
  const sameLen = snapshot.pairs.length === next.length;
  const sameItems = sameLen && snapshot.pairs.every((r, i) => r === next[i]);
  if (sameLen && sameItems) return;

  snapshot = Object.freeze({ pairs: Object.freeze(next.slice()) });
  listeners.forEach((l) => l());
}
