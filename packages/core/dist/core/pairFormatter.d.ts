/**
 * Normalizes LP pairs by ensuring consistent token ordering (lexicographically)
 * and removes duplicates from multiple DEXs or redundant listings.
 */
import type { RawLP } from '../dex/dexCollector.js';
export interface CanonicalPair {
    tokenA: string;
    tokenB: string;
    pairAddress: string;
    dex: string;
    key: string;
}
/**
 * Formats and deduplicates raw LP data into canonical pairs
 */
export declare function normalizePairs(pairs: RawLP[]): CanonicalPair[];
//# sourceMappingURL=pairFormatter.d.ts.map