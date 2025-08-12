import type { ArbStrategy } from '../types/strategyTypes.js';
import { withFlashloan } from './mixins/withFlashloan.js';
import { withPermit2 } from './mixins/withPermit2.js';
import { ExecutionResult } from '../monitorExecution.js';

export interface GuardrailConfig {
  minProfitUSD: number;
  slippageToleranceBps: number;
  maxGasUSD: number;
  maxRv: number;
}

const DEFAULT_GUARDRAILS: GuardrailConfig = {
  minProfitUSD: 0,
  slippageToleranceBps: 0,
  maxGasUSD: Infinity,
  maxRv: Infinity,
};

function fail(reason: string): ArbStrategy {
  return {
    shouldExecute: false,
    reason,
    buildCalldata: async () => '0x',
    dryRun: async () => ({ status: 'reverted' } as ExecutionResult),
  };
}

export function strategyBuilder(
  trace: any,
  spread: any,
  config: Partial<GuardrailConfig> = {},
): ArbStrategy {
  const cfg = { ...DEFAULT_GUARDRAILS, ...config };
  const profit = Number(spread?.estimatedProfit ?? 0);
  if (profit < cfg.minProfitUSD) return fail('minProfitUSD');

  const slippage = Number(spread?.slippageBps ?? 0);
  if (slippage > cfg.slippageToleranceBps) return fail('slippageTolerance');

  const gasCost = Number(trace?.gasCostUSD ?? 0);
  if (gasCost > cfg.maxGasUSD) return fail('gasSensitivity');

  const rv = Number(trace?.rv3Block ?? 0);
  if (rv > cfg.maxRv) return fail('rvClamp');

  let strategy: ArbStrategy = {
    shouldExecute: true,
    reason: null,
    buildCalldata: async () => '0x',
    dryRun: async () => ({ status: 'success' } as ExecutionResult),
  };

  if (process.env.FEATURE_FLASHLOAN === 'true') {
    strategy = withFlashloan(strategy);
  }
  if (process.env.FEATURE_PERMIT2 === 'true') {
    strategy = withPermit2(strategy);
  }

  return strategy;
}
