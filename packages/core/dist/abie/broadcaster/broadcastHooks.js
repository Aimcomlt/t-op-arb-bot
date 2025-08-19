// src/abie/broadcaster/broadcastHooks.ts
import { broadcastABIEEvent } from './abieBroadcaster.js';
import { ABIE_EVENT_TYPES } from '@/abie/broadcaster/eventTypes.js';
/**
 * Helper functions to emit standardized ABIE event broadcasts.
 * These wrappers ensure clean, consistent usage across the codebase.
 */
export function emitSyncEvent(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.SYNC_EVENT, payload);
}
export function emitArbOpportunity(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.ARB_OPPORTUNITY, payload);
}
export function emitExecutionResult(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.EXECUTION_RESULT, payload);
}
export function emitSimulationLog(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.SIMULATION_LOG, payload);
}
export function emitRevertAlert(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.ALERT_REVERT, payload);
}
export function emitSystemLog(payload) {
    broadcastABIEEvent(ABIE_EVENT_TYPES.SYSTEM_LOG, payload);
}
