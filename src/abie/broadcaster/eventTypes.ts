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
} as const;

export type ABIEEventType = typeof ABIE_EVENT_TYPES[keyof typeof ABIE_EVENT_TYPES];

/**
 * Type-safe event payload structures.
 * Extend as new event types are added.
 */
export interface ABIEEventPayloads {
  sync_event: {
    pairSymbol: string;
    dex: string;
    reserves: { reserve0: string; reserve1: string };
    timestamp: number;
  };
  arb_opportunity: {
    tokenIn: string;
    tokenOut: string;
    spread: string;
    buyOn: string;
    sellOn: string;
    estimatedProfit: string;
  };
  execution_result: {
    txHash: string;
    status: 'success' | 'reverted';
    profit: string;
    gasUsed: string;
  };
  simulation_log: {
    txHash: string;
    decodedInput: string;
    traceSummary: string;
  };
  alert_revert: {
    reason: string;
    context?: any;
  };
  system_log: {
    message: string;
    level: 'info' | 'warn' | 'error';
  };
}
