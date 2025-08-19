import fs from 'fs';
import path from 'path';
const CACHE_FILE = path.join(process.cwd(), 'trace-cache.json');
class LRUCache {
    constructor(limit = 100) {
        Object.defineProperty(this, "limit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: limit
        });
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this.load();
        // Persist on normal exit and Ctrl+C
        process.on('exit', () => this.persist());
        process.on('SIGINT', () => {
            this.persist();
            process.exit(0);
        });
    }
    load() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
                const entries = JSON.parse(raw);
                this.cache = new Map(entries);
            }
        }
        catch {
            // ignore corrupted or unreadable cache
        }
    }
    persist() {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify([...this.cache.entries()]));
        }
        catch {
            // ignore I/O errors during persist
        }
    }
    get(key) {
        if (key === undefined)
            return undefined;
        const k = key;
        const val = this.cache.get(k);
        if (val === undefined)
            return undefined;
        // LRU promotion
        this.cache.delete(k);
        this.cache.set(k, val);
        return val;
    }
    set(key, value) {
        if (key === undefined)
            return;
        const k = key;
        if (this.cache.has(k))
            this.cache.delete(k);
        this.cache.set(k, value);
        if (this.cache.size > this.limit) {
            const firstIter = this.cache.keys().next(); // IteratorResult<NonUndef<K>, any>
            if (!firstIter.done) {
                this.cache.delete(firstIter.value);
            }
        }
    }
    has(key) {
        if (key === undefined)
            return false;
        return this.cache.has(key);
    }
    delete(key) {
        if (key === undefined)
            return;
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
export const traceCache = new LRUCache();
