import type { CanonicalPair } from './pairFormatter.js';
export interface TokenMeta {
    address: string;
    symbol: string;
    decimals: number;
}
export declare function consolidateTokenMeta(pairs: CanonicalPair[]): Promise<Record<string, TokenMeta>>;
//# sourceMappingURL=metaConsolidator.d.ts.map