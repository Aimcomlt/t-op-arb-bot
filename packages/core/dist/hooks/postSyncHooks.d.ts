import type { SyncEventLog } from '../types/SyncTrace.js';
/**
 * Invoked after an LP Sync event is received.
 * It builds the SyncTrace, scans for spreads, and triggers strategy execution
 * if an arbitrage opportunity is detected.
 */
export declare function postSyncHooks(log: SyncEventLog): Promise<void>;
//# sourceMappingURL=postSyncHooks.d.ts.map