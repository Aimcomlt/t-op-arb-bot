import { ExecutionResult } from '../monitorExecution';

export interface ArbStrategy {
  pairSymbol: string;
  route: string[];
  execute: () => Promise<ExecutionResult>;
}
