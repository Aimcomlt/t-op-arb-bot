// src/hooks/postExecutionHooks.ts

import { ExecutionResult } from "../monitorExecution";
import { ArbStrategy } from "../types/strategyTypes";

import {
  emitExecutionResult,
  emitRevertAlert,
  emitSystemLog
} from "../abie/broadcaster/broadcastHooks";

import { updateSlippageTolerance } from "../config/arbitrageConfig";
import { logToDatabase } from "../utils/dbLogger";
import { simulateUnknownTx } from "../abie/simulation/simulateUnknownTx";
import { formatTraceForLogs } from "../utils/formatTraceForLogs";

/**
 * Executes post-trade logic after a strategy has been confirmed
 * (or failed) via monitorExecution.ts.
 *
 * Enhancements:
 * - Decodes unknown transactions using debug_trace
 * - Logs ABI-decoded trace summary to console
 * - Maintains original logging + broadcast logic
 */

interface PostExecutionContext {
  strategy: ArbStrategy;
  result: ExecutionResult;
}

export async function postExecutionHooks({ strategy, result }: PostExecutionContext) {
  const { txHash, status, profitAchieved, gasUsed } = result;

  // 1. Log trade result to persistent storage
  await logToDatabase({
    timestamp: Date.now(),
    txHash: txHash || "N/A",
    status,
    strategy,
    actualProfit: profitAchieved || "0",
    gasUsed: gasUsed || "0"
  });

  // 2. Emit result to frontend listeners
  emitExecutionResult({
    txHash: txHash || "N/A",
    status,
    profit: profitAchieved || "0",
    gasUsed: gasUsed || "0"
  });

  // 3. Adaptive tuning — optionally adjust slippage based on result
  if (status === "success") {
    updateSlippageTolerance(strategy.pairSymbol, profitAchieved);
  }

  // 4. Emit warning if trade reverted
  if (status === "reverted") {
    emitRevertAlert({
      reason: "Trade reverted",
      context: {
        pair: strategy.pairSymbol,
        route: strategy.route
      }
    });
  }

  // 5. Simulate unknown tx trace and log if traceable
  if (txHash) {
    try {
      const traceResult = await simulateUnknownTx({ txHash });
      if (traceResult) {
        const traceLog = formatTraceForLogs(traceResult);
        console.log(`\n--- [Simulated TX Trace: ${txHash}] ---`);
        console.log(traceLog);
        console.log("--- [End Trace] ---\n");

        // Optionally broadcast this trace or store it for frontend strategy viewer
        // dispatchToABIE({ type: "SIM_TRACE", payload: traceResult });
      }
    } catch (err) {
      console.warn(`[postExecution] Simulation failed for ${txHash}:`, err);
    }
  }

  // 6. System-level heartbeat log
  emitSystemLog({
    message: `Post-execution complete for ${strategy.pairSymbol}`,
    level: "info"
  });
}
