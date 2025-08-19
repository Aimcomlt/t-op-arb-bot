import type { SpreadComputationResult } from '../types/arbitrageTypes.js';
import type { SyncTrace } from '../types/SyncTrace.js';
/**
 * Invoked after an arbitrage spread is detected by scanDiscrepancy().
 * Can be used to emit early alerts, passively log spreads, or perform
 * secondary simulations even if profitGuard fails.
 *
 * @param trace - The SyncTrace that triggered this spread
 * @param spread - The detected SpreadComputationResult
 */
export declare function postDiscrepancyHooks(trace: SyncTrace, spread: SpreadComputationResult): Promise<void>;
//# sourceMappingURL=postDiscrepancyHooks.d.ts.map