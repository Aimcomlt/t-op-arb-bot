import type { ExecutionResult } from '../monitorExecution.js';

export interface ArbStrategy {
  pairSymbol?: string;
  route?: string[];
  safeLoanSize?: bigint;
  shouldExecute: boolean;
  reason: string | null;
  buildCalldata: () => Promise<string>;
  dryRun: () => Promise<ExecutionResult>;
}
