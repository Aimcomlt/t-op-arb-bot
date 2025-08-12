import { ExecutionResult } from '../monitorExecution.js';

export interface ArbStrategy {
  pairSymbol?: string;
  route?: string[];
  shouldExecute: boolean;
  reason: string | null;
  buildCalldata: () => Promise<string>;
  dryRun: () => Promise<ExecutionResult>;
}
