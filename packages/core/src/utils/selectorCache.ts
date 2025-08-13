import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'selector-cache.json');

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

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.limit) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const selectorAbiCache = new LRUCache<string, any>();
