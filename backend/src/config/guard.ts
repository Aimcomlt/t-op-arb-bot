export const guardConfig = {
  tradablePairs: ['WETH/USDC'],
  maxGas: 2_000_000n,
  maxSlippageBps: 100, // 1%
  profitFloor: 0.01, // minimum profit in base units
} as const;

export interface SimulationResult {
  pair: string;
  gasUsed: bigint;
  priceImpactBps: number;
  expectedProfit: number;
}

export function withinGuard(sim: SimulationResult): boolean {
  if (!guardConfig.tradablePairs.includes(sim.pair)) return false;
  if (sim.gasUsed > guardConfig.maxGas) return false;
  if (sim.priceImpactBps > guardConfig.maxSlippageBps) return false;
  if (sim.expectedProfit < guardConfig.profitFloor) return false;
  return true;
}
