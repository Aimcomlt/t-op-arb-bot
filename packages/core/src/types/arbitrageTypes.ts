export interface SpreadComputationResult {
  tokenIn: string;
  tokenOut: string;
  spread: number;
  buyOn: string;
  sellOn: string;
  estimatedProfit: number;
}
