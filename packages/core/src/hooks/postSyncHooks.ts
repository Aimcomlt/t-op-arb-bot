// src/hooks/postSyncHooks.ts

import { buildSyncTrace } from '../tracing/buildSyncTrace.js';
import { scanDiscrepancy } from '../core/scanDiscrepancy.js';
import { strategyBuilder } from '../core/strategyBuilder.js';
import { profitGuard } from '../utils/profitGuard.js';
import { postExecutionHooks } from './postExecutionHooks.js';

import { emitSyncEvent, emitArbOpportunity } from '../abie/broadcaster/broadcastHooks.js';
import { SyncEventLog } from '../types/SyncTrace.js';
import { ArbStrategy } from '../types/strategyTypes.js';
import { ExecutionResult } from '../monitorExecution.js';

/**
 * Invoked after an LP Sync event is received.
 * It builds the SyncTrace, scans for spreads, and triggers strategy execution
 * if an arbitrage opportunity is detected.
 * 
 * @param log - The decoded Sync log with LP address and reserve updates
 */
export async function postSyncHooks(log: SyncEventLog) {
  try {
    // 1. Reconstruct SyncTrace object from log
    const syncTrace = await buildSyncTrace(log);

    // 2. Broadcast the sync event to frontend
    emitSyncEvent({
      pairSymbol: syncTrace.pairSymbol,
      dex: syncTrace.dex,
      reserves: syncTrace.reservesAfter,
      timestamp: syncTrace.timestamp
    });

    // 3. Scan for arbitrage spread from updated reserves
    const spreadResult = await scanDiscrepancy(syncTrace);

    if (!spreadResult) return;

    // 4. Broadcast the opportunity
    emitArbOpportunity({
      tokenIn: spreadResult.tokenIn,
      tokenOut: spreadResult.tokenOut,
      spread: spreadResult.spread,
      buyOn: spreadResult.buyOn,
      sellOn: spreadResult.sellOn,
      estimatedProfit: spreadResult.estimatedProfit
    });

    // 5. Run profit guard to validate thresholds
    const isViable = profitGuard({
      expectedProceeds: BigInt(Math.floor(spreadResult.estimatedProfit ?? 0)),
      gasCost: 0n,
      flashFee: 0n,
    });
    if (!isViable) return;

    // 6. Build executable strategy from spread + trace
    const strategy = strategyBuilder(syncTrace, spreadResult) as unknown as ArbStrategy;

    // 7. Simulate + execute trade (next step: hook into execution engine)
    const executionResult = (await strategy.execute()) as ExecutionResult;

    // 8. Send results to post-trade handling
    await postExecutionHooks({ strategy, result: executionResult });

  } catch (err) {
    console.error('[postSyncHooks] Error processing Sync event:', err);
  }
}
