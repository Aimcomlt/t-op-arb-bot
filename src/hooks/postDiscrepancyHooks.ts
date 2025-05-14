// src/hooks/postDiscrepancyHooks.ts

import { SpreadComputationResult } from '../types/arbitrageTypes';
import { SyncTrace } from '../types/SyncTrace';
import { emitArbOpportunity, emitSystemLog } from '../abie/broadcaster/broadcastHooks';

/**
 * Invoked after an arbitrage spread is detected by scanDiscrepancy().
 * Can be used to emit early alerts, passively log spreads, or perform
 * secondary simulations even if profitGuard fails.
 *
 * @param trace - The SyncTrace that triggered this spread
 * @param spread - The detected SpreadComputationResult
 */
export async function postDiscrepancyHooks(trace: SyncTrace, spread: SpreadComputationResult) {
  try {
    // 1. Broadcast the spread opportunity regardless of execution
    emitArbOpportunity({
      tokenIn: spread.tokenIn,
      tokenOut: spread.tokenOut,
      spread: spread.spread,
      buyOn: spread.buyOn,
      sellOn: spread.sellOn,
      estimatedProfit: spread.estimatedProfit
    });

    // 2. Optional: Log to analytics / metrics
    emitSystemLog({
      message: `Spread detected: ${trace.pairSymbol} | ${spread.spread} spread`,
      level: 'info'
    });

    // 3. Optional: Run simulation in background without executing
    // await simulateTrade(trace, spread);

  } catch (err) {
    console.error('[postDiscrepancyHooks] error:', err);
  }
}
