// src/hooks/postExecutionHooks.ts

import { ExecutionResult } from '../monitorExecution';
import { ArbStrategy } from '../types/strategyTypes';

import {
  emitExecutionResult,
  emitRevertAlert,
  emitSystemLog
} from '../abie/broadcaster/broadcastHooks';

import { updateSlippageTolerance } from '../config/arbitrageConfig';
import { logToDatabase } from '../utils/dbLogger';

/**
 * Executes post-trade logic after a strategy has been confirmed
 * (or failed) via monitorExecution.ts.
 * 
 * This includes:
 * - Logging to DB
 * - Broadcasting to frontend
 * - Adaptive parameter updates
 * - Revert alert notifications
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
    txHash: txHash || 'N/A',
    status,
    strategy,
    actualProfit: profitAchieved || '0',
    gasUsed: gasUsed || '0'
  });

  // 2. Emit result to frontend listeners
  emitExecutionResult({
    txHash: txHash || 'N/A',
    status,
    profit: profitAchieved || '0',
    gasUsed: gasUsed || '0'
  });

  // 3. Adaptive tuning — optionally adjust slippage based on profit result
  if (status === 'success') {
    updateSlippageTolerance(strategy.pairSymbol, profitAchieved);
  }

  // 4. Emit warning if trade reverted
  if (status === 'reverted') {
    emitRevertAlert({
      reason: 'Trade reverted',
      context: { pair: strategy.pairSymbol, route: strategy.route }
    });
  }

  // 5. System-level heartbeat log
  emitSystemLog({
    message: `Post-execution complete for ${strategy.pairSymbol}`,
    level: 'info'
  });
  }
