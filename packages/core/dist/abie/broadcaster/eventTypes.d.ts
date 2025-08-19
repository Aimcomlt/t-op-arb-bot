/**
 * Enum-like list of supported ABIE broadcast event types.
 * These types help maintain consistency across backend modules
 * and frontend listeners.
 */
export declare const ABIE_EVENT_TYPES: {
    readonly SYNC_EVENT: "sync_event";
    readonly ARB_OPPORTUNITY: "arb_opportunity";
    readonly EXECUTION_RESULT: "execution_result";
    readonly SIMULATION_LOG: "simulation_log";
    readonly ALERT_REVERT: "alert_revert";
    readonly SYSTEM_LOG: "system_log";
};
export type ABIEEventType = typeof ABIE_EVENT_TYPES[keyof typeof ABIE_EVENT_TYPES];
/**
 * Type-safe event payload structures.
 * Extend as new event types are added.
 */
export interface ABIEEventPayloads {
    sync_event: {
        pairSymbol: string;
        dex: string;
        reserves: {
            reserve0: string | number;
            reserve1: string | number;
        };
        timestamp: string | number;
    };
    arb_opportunity: {
        tokenIn: string;
        tokenOut: string;
        spread: string | number;
        buyOn: string;
        sellOn: string;
        estimatedProfit: string | number;
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
//# sourceMappingURL=eventTypes.d.ts.map