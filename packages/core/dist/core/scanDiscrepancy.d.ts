import type { SpreadComputationResult } from '../types/arbitrageTypes.js';
export interface DexSnapshot {
    pairSymbol: string;
    dex: string;
    reserves: [number, number];
}
export interface ScanOptions {
    minLiquidity?: number;
    thresholdBps?: number;
}
/**
 * Scans a set of DEX snapshots for arbitrage opportunities.
 * Prices are normalized as tokenOut per tokenIn.
 */
export declare function scanDiscrepancy(snapshots: DexSnapshot[], opts?: ScanOptions): SpreadComputationResult | null;
//# sourceMappingURL=scanDiscrepancy.d.ts.map