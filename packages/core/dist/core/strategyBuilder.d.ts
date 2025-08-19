import type { ArbStrategy } from '../types/strategyTypes.js';
export interface GuardrailConfig {
    minProfitUSD: number;
    slippageToleranceBps: number;
    maxGasUSD: number;
    maxRv: number;
}
export declare function strategyBuilder(trace: any, spread: any, config?: Partial<GuardrailConfig>): ArbStrategy;
//# sourceMappingURL=strategyBuilder.d.ts.map