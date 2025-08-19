export { emitExecutionResult, emitRevertAlert } from '@/abie/broadcaster/broadcastHooks.js';
export { updateSlippageTolerance } from '@/config/arbitrageConfig.js';
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