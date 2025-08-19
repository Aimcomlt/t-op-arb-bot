export declare class LRUCache<K, V> {
    private readonly limit;
    private cache;
    constructor(limit?: number);
    private load;
    private persist;
    get(key: K | undefined): V | undefined;
    set(key: K | undefined, value: V): void;
    has(key: K | undefined): boolean;
    delete(key: K | undefined): void;
    clear(): void;
    get size(): number;
}
export declare const selectorAbiCache: LRUCache<string, unknown>;
export declare function clearAbiCache(): void;
//# sourceMappingURL=abiCache.d.ts.map