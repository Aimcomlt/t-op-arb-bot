export interface ExecutionResult {
  txHash?: string;
  status: 'success' | 'reverted';
  profitAchieved?: string;
  gasUsed?: string;
}
