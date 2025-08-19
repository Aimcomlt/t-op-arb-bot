import fs from 'fs';
import path from 'path';

// Persist ABI cache so selectors don't need to be re-fetched every run
const CACHE_FILE = path.join(process.cwd(), 'abi-cache.json');

type NonUndef<T> = T extends undefined ? never : T;

export class LRUCache<K, V> {
  private cache: Map<NonUndef<K>, V> = new Map();
  constructor(private readonly limit = 100) {
    this.load();
    // Persist on normal exit and Ctrl+C
    process.on('exit', () => this.persist());
    process.on('SIGINT', () => {
      this.persist();
      // re-emit to allow default behavior
      process.exit(0);
    });
  }

  private load() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        // Expecting entries as [key, value][] — keys must be serializable (e.g., strings)
        const entries = JSON.parse(raw) as [NonUndef<K>, V][];
        this.cache = new Map(entries);
      }
    } catch {
      // ignore corrupted cache
    }
  }

  private persist() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify([...this.cache.entries()]));
    } catch {
      // ignore I/O errors on persist
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
      // Safely get the oldest key
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

// Concrete cache for function selectors -> ABI fragments (or decoded forms)
export const selectorAbiCache = new LRUCache<string, unknown>();

export function clearAbiCache() {
  selectorAbiCache.clear();
  try {
    fs.unlinkSync(CACHE_FILE);
  } catch {
    // ignore if file doesn't exist
  }
}
