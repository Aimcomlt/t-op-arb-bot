// src/hooks/postSyncHooks.ts
import { buildSyncTrace } from '../tracing/buildSyncTrace.js';
import { scanDiscrepancy } from '../core/scanDiscrepancy.js';
import { strategyBuilder } from '../core/strategyBuilder.js';
import { profitGuard } from '../utils/profitGuard.js';
import { postExecutionHooks } from './postExecutionHooks.js';
import { emitSyncEvent, emitArbOpportunity } from '../abie/broadcaster/broadcastHooks.js';
/**
 * Invoked after an LP Sync event is received.
 * It builds the SyncTrace, scans for spreads, and triggers strategy execution
 * if an arbitrage opportunity is detected.
 */
export async function postSyncHooks(log) {
    try {
        // 1) Reconstruct SyncTrace from the log
        const syncTrace = await buildSyncTrace(log);
        // 2) Broadcast the sync event to frontend
        emitSyncEvent({
            pairSymbol: syncTrace.pairSymbol,
            dex: syncTrace.dex,
            reserves: {
                reserve0: String(syncTrace.reservesAfter[0]),
                reserve1: String(syncTrace.reservesAfter[1]),
            },
            timestamp: syncTrace.timestamp,
        });
        // 3) Scan for arbitrage opportunity
        const spreadResult = await scanDiscrepancy(syncTrace);
        if (!spreadResult)
            return;
        // 4) Broadcast the opportunity
        emitArbOpportunity({
            tokenIn: spreadResult.tokenIn,
            tokenOut: spreadResult.tokenOut,
            spread: String(spreadResult.spread),
            buyOn: spreadResult.buyOn,
            sellOn: spreadResult.sellOn,
            estimatedProfit: String(spreadResult.estimatedProfit),
        });
        // 5) Profit guard
        const isViable = profitGuard({
            expectedProceeds: BigInt(Math.floor(spreadResult.estimatedProfit ?? 0)),
            gasCost: 0n,
            flashFee: 0n,
        });
        if (!isViable)
            return;
        // 6) Build executable strategy (do not mutate; tests compare by reference/shape)
        const strategy = strategyBuilder(syncTrace, spreadResult);
        if (!strategy?.shouldExecute)
            return;
        // 7) Simulate / prepare trade
        await strategy.buildCalldata?.();
        const executionResult = (await strategy.dryRun?.());
        if (!executionResult)
            return;
        // 8) Post-trade handling via callable facade (tests spy on this exact call)
        await postExecutionHooks({ strategy, result: executionResult });
    }
    catch (err) {
        console.error('[postSyncHooks] Error processing Sync event:', err);
    }
}
