import type { ABIEEventPayloads } from '@/abie/broadcaster/eventTypes.js';
/**
 * Helper functions to emit standardized ABIE event broadcasts.
 * These wrappers ensure clean, consistent usage across the codebase.
 */
export declare function emitSyncEvent(payload: ABIEEventPayloads['sync_event']): void;
export declare function emitArbOpportunity(payload: ABIEEventPayloads['arb_opportunity']): void;
export declare function emitExecutionResult(payload: ABIEEventPayloads['execution_result']): void;
export declare function emitSimulationLog(payload: ABIEEventPayloads['simulation_log']): void;
export declare function emitRevertAlert(payload: ABIEEventPayloads['alert_revert']): void;
export declare function emitSystemLog(payload: ABIEEventPayloads['system_log']): void;
//# sourceMappingURL=broadcastHooks.d.ts.map