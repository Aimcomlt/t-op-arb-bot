import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'trace-cache.json');

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private readonly limit = 100) {
    this.load();
    process.on('exit', () => this.persist());
  }

  private load() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        this.cache = new Map(data);
      }
    } catch {}
  }

  private persist() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify([...this.cache.entries()]));
    } catch {}
  }

  get(key: K | undefined): V | undefined {
    if (key === undefined) return undefined;
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key as K)!;
    this.cache.delete(key as K);
    this.cache.set(key as K, val);
    return val;
  }

  set(key: K | undefined, value: V) {
    if (key === undefined) return;
    if (this.cache.has(key as K)) this.cache.delete(key as K);
    this.cache.set(key as K, value);
    if (this.cache.size > this.limit) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const traceCache = new LRUCache<string, any>();
