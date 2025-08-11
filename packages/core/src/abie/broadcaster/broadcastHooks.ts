// src/abie/broadcaster/broadcastHooks.ts

import { broadcastABIEEvent } from './abieBroadcaster.js';
import { ABIE_EVENT_TYPES, ABIEEventPayloads } from './eventTypes.js';

/**
 * Helper functions to emit standardized ABIE event broadcasts.
 * These wrappers ensure clean, consistent usage across the codebase.
 */

export function emitSyncEvent(payload: ABIEEventPayloads['sync_event']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.SYNC_EVENT, payload);
}

export function emitArbOpportunity(payload: ABIEEventPayloads['arb_opportunity']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.ARB_OPPORTUNITY, payload);
}

export function emitExecutionResult(payload: ABIEEventPayloads['execution_result']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.EXECUTION_RESULT, payload);
}

export function emitSimulationLog(payload: ABIEEventPayloads['simulation_log']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.SIMULATION_LOG, payload);
}

export function emitRevertAlert(payload: ABIEEventPayloads['alert_revert']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.ALERT_REVERT, payload);
}

export function emitSystemLog(payload: ABIEEventPayloads['system_log']) {
  broadcastABIEEvent(ABIE_EVENT_TYPES.SYSTEM_LOG, payload);
}
