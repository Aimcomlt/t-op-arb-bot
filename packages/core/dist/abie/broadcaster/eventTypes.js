// src/abie/broadcaster/eventTypes.ts
/**
 * Enum-like list of supported ABIE broadcast event types.
 * These types help maintain consistency across backend modules
 * and frontend listeners.
 */
export const ABIE_EVENT_TYPES = {
    SYNC_EVENT: 'sync_event',
    ARB_OPPORTUNITY: 'arb_opportunity',
    EXECUTION_RESULT: 'execution_result',
    SIMULATION_LOG: 'simulation_log',
    ALERT_REVERT: 'alert_revert',
    SYSTEM_LOG: 'system_log'
};
