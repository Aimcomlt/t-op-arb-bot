import { ExecutionResult } from '../monitorExecution.js';

export interface ArbStrategy {
  pairSymbol: string;
  route: string[];
  execute: () => Promise<ExecutionResult>;
}
