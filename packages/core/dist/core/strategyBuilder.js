import { withFlashloan } from './mixins/withFlashloan.js';
import { withPermit2 } from './mixins/withPermit2.js';
const DEFAULT_GUARDRAILS = {
    minProfitUSD: 0,
    slippageToleranceBps: 0,
    maxGasUSD: Infinity,
    maxRv: Infinity,
};
function fail(reason) {
    return {
        shouldExecute: false,
        reason,
        buildCalldata: async () => '0x',
        dryRun: async () => ({ status: 'reverted' }),
    };
}
export function strategyBuilder(trace, spread, config = {}) {
    const cfg = { ...DEFAULT_GUARDRAILS, ...config };
    const profit = Number(spread?.estimatedProfit ?? 0);
    if (profit < cfg.minProfitUSD)
        return fail('minProfitUSD');
    const slippage = Number(spread?.slippageBps ?? 0);
    if (slippage > cfg.slippageToleranceBps)
        return fail('slippageTolerance');
    const gasCost = Number(trace?.gasCostUSD ?? 0);
    if (gasCost > cfg.maxGasUSD)
        return fail('gasSensitivity');
    const rv = Number(trace?.rv3Block ?? 0);
    if (rv > cfg.maxRv)
        return fail('rvClamp');
    const safeLoanSize = BigInt(spread?.safeLoanSize ?? 0);
    let strategy = {
        shouldExecute: true,
        reason: null,
        safeLoanSize,
        buildCalldata: async () => '0x',
        dryRun: async () => ({ status: 'success' }),
    };
    if (process.env.FEATURE_FLASHLOAN === 'true') {
        strategy = withFlashloan(strategy, safeLoanSize);
    }
    if (process.env.FEATURE_PERMIT2 === 'true') {
        strategy = withPermit2(strategy);
    }
    return strategy;
}
