export { emitExecutionResult, emitRevertAlert } from '@/abie/broadcaster/broadcastHooks.js';
/** Exported so tests can spy; noop until wired to a real DB. */
export declare function logToDatabase(_entry: {
    txHash: string;
    trace?: unknown;
}): Promise<void>;
/** Optional tuning stub */
export declare function updateSlippageTolerance(_pair: string, _profit: unknown): void;
/** Method 1: success handler (tests call this directly) */
export declare function onExecutionSuccess(args: {
    txHash: string;
    pair: string;
    route: string[] | string;
    trace?: unknown;
    profit?: unknown;
    gasUsed?: string;
}): Promise<void>;
/** Method 2: revert handler (tests call this directly) */
export declare function onExecutionRevert(args: {
    pair: string;
    route: string[] | string;
    reason?: string;
}): void;
/**
 * Callable facade (tests also spy on this):
 * postExecutionHooks({ strategy, result })
 */
export declare function postExecutionHooks(args: {
    strategy: any;
    result: any;
}): Promise<void>;
//# sourceMappingURL=postExecutionHooks.d.ts.map