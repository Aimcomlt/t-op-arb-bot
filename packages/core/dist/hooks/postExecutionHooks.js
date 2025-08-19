// packages/core/src/hooks/postExecutionHooks.ts
// Re-export so tests can spy via this module
export { emitExecutionResult, emitRevertAlert } from '@/abie/broadcaster/broadcastHooks.js';
export { updateSlippageTolerance } from '@/config/arbitrageConfig.js';
// Local aliases used internally
import { emitExecutionResult as _emitExecutionResult, emitRevertAlert as _emitRevertAlert, emitSystemLog as _emitSystemLog, } from '@/abie/broadcaster/broadcastHooks.js';
import { logToDatabase } from '@blazing/core/utils/dbLogger.js';
import { updateSlippageTolerance } from '@/config/arbitrageConfig.js';
import { simulateUnknownTx } from '@/abie/simulation/simulateUnknownTx.js';
import { formatTraceForLogs } from '@/utils/formatTraceForLogs.js';
/** Helpers */
function toProfitString(p) {
    if (typeof p === 'bigint')
        return p.toString();
    if (typeof p === 'number')
        return Math.trunc(p).toString();
    if (typeof p === 'string')
        return p;
    return '0';
}
function toRouteString(route) {
    if (Array.isArray(route))
        return route.join(' -> ');
    if (typeof route === 'string')
        return route;
    return undefined;
}
/** Method 1: success handler (tests call this directly) */
export async function onExecutionSuccess(args) {
    await logToDatabase({ txHash: args.txHash, trace: args.trace });
    _emitExecutionResult({
        txHash: args.txHash,
        status: 'success',
        profit: toProfitString(args.profit),
        gasUsed: args.gasUsed ?? '0',
    });
    updateSlippageTolerance(args.pair, toProfitString(args.profit));
    const sim = await simulateUnknownTx({ txHash: args.txHash });
    if (sim?.trace) {
        const formatted = formatTraceForLogs(sim.trace);
        console.log(formatted);
        _emitSystemLog({ message: formatted, level: 'info' });
    }
}
/** Method 2: revert handler (tests call this directly) */
export function onExecutionRevert(args) {
    _emitRevertAlert({
        reason: args.reason ?? 'Trade reverted',
        context: { pair: args.pair, route: toRouteString(args.route) ?? '' }, // tests expect "A -> B"
    });
}
/**
 * Callable facade (tests also spy on this):
 * postExecutionHooks({ strategy, result })
 */
export async function postExecutionHooks(args) {
    const { strategy, result } = args || {};
    const pair = strategy?.pairSymbol ?? strategy?.pair ?? 'UNKNOWN/UNKNOWN';
    const route = strategy?.route; // array or string
    const status = result?.status;
    if (status === 'success') {
        await onExecutionSuccess({
            txHash: result?.txHash ?? '0x',
            pair,
            route,
            trace: result?.trace,
            profit: result?.profit ?? result?.metrics?.profit ?? result?.summary?.profit,
            gasUsed: result?.gasUsed ?? result?.metrics?.gasUsed ?? result?.summary?.gasUsed,
        });
    }
    else if (status === 'reverted') {
        onExecutionRevert({
            pair,
            route,
            reason: result?.reason,
        });
    }
}
// Attach methods to the callable so both styles work:
postExecutionHooks.onExecutionSuccess = onExecutionSuccess;
postExecutionHooks.onExecutionRevert = onExecutionRevert;
