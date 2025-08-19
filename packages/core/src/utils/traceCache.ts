import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'trace-cache.json');

type NonUndef<T> = T extends undefined ? never : T;

class LRUCache<K, V> {
  private cache: Map<NonUndef<K>, V> = new Map();

  constructor(private readonly limit = 100) {
    this.load();
    // Persist on normal exit and Ctrl+C
    process.on('exit', () => this.persist());
    process.on('SIGINT', () => {
      this.persist();
      process.exit(0);
    });
  }

  private load() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const entries = JSON.parse(raw) as [NonUndef<K>, V][];
        this.cache = new Map(entries);
      }
    } catch {
      // ignore corrupted or unreadable cache
    }
  }

  private persist() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify([...this.cache.entries()]));
    } catch {
      // ignore I/O errors during persist
    }
  }

  get(key: K | undefined): V | undefined {
    if (key === undefined) return undefined;
    const k = key as NonUndef<K>;
    const val = this.cache.get(k);
    if (val === undefined) return undefined;
    // LRU promotion
    this.cache.delete(k);
    this.cache.set(k, val);
    return val;
  }

  set(key: K | undefined, value: V): void {
    if (key === undefined) return;
    const k = key as NonUndef<K>;

    if (this.cache.has(k)) this.cache.delete(k);
    this.cache.set(k, value);

    if (this.cache.size > this.limit) {
      const firstIter = this.cache.keys().next(); // IteratorResult<NonUndef<K>, any>
      if (!firstIter.done) {
        this.cache.delete(firstIter.value);
      }
    }
  }

  has(key: K | undefined): boolean {
    if (key === undefined) return false;
    return this.cache.has(key as NonUndef<K>);
  }

  delete(key: K | undefined): void {
    if (key === undefined) return;
    this.cache.delete(key as NonUndef<K>);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export const traceCache = new LRUCache<string, unknown>();
