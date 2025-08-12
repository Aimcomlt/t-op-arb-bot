export interface Opportunity {
  pairSymbol: string;
  spreadBps: number;
  minLiquidityUSD: number;
  score: number;
  expiresAt: number;
}

interface HeapNode extends Opportunity {
  index: number;
}

export class OpportunityStore {
  private heap: HeapNode[] = [];
  private map = new Map<string, HeapNode>();
  private readonly ttlMs: number;
  private readonly cap: number;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(opts: { ttlMs?: number; cap?: number } = {}) {
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.cap = opts.cap ?? 100;
    // periodic pruning to avoid stale entries if no activity
    this.cleanupInterval = setInterval(() => this.prune(), this.ttlMs);
    // don't keep Node process alive
    (this.cleanupInterval as any).unref?.();
  }

  upsert(pairSymbol: string, spreadBps: number, minLiquidityUSD: number): void {
    const score = spreadBps * minLiquidityUSD;
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    const existing = this.map.get(pairSymbol);
    if (existing) {
      existing.spreadBps = spreadBps;
      existing.minLiquidityUSD = minLiquidityUSD;
      existing.score = score;
      existing.expiresAt = expiresAt;
      this.bubbleUp(existing.index);
      this.bubbleDown(existing.index);
      return;
    }

    const node: HeapNode = {
      pairSymbol,
      spreadBps,
      minLiquidityUSD,
      score,
      expiresAt,
      index: this.heap.length,
    };
    this.heap.push(node);
    this.map.set(pairSymbol, node);
    this.bubbleUp(node.index);

    if (this.heap.length > this.cap) {
      const removed = this.pop();
      if (removed) this.map.delete(removed.pairSymbol);
    }
  }

  size(): number {
    this.prune();
    return this.heap.length;
  }

  snapshot(): Opportunity[] {
    this.prune();
    return [...this.heap]
      .sort((a, b) => b.score - a.score)
      .map(({ index: _i, ...rest }) => rest);
  }

  clear(): void {
    this.heap = [];
    this.map.clear();
  }

  private pop(): HeapNode | null {
    if (this.heap.length === 0) return null;
    const root = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      last.index = 0;
      this.bubbleDown(0);
    }
    root.index = -1;
    return root;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].score >= this.heap[parent].score) break;
      this.swap(idx, parent);
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = left + 1;
      let smallest = idx;
      if (left < length && this.heap[left].score < this.heap[smallest].score) {
        smallest = left;
      }
      if (right < length && this.heap[right].score < this.heap[smallest].score) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
    this.heap[i].index = i;
    this.heap[j].index = j;
  }

  prune(now = Date.now()): void {
    while (this.heap.length > 0 && this.heap[0].expiresAt <= now) {
      const expired = this.pop();
      if (expired) this.map.delete(expired.pairSymbol);
    }
  }
}

export const opportunityStore = new OpportunityStore();
