import type { TraceResult } from '@t-op-arb-bot/types';
interface SimulationInput {
    txHash: string;
}
export interface SimulationResult {
    trace: TraceResult;
    profit: {
        token: string;
        amount: bigint;
    } | null;
    safeLoanSize: bigint;
}
export declare function simulateUnknownTx({ txHash }: SimulationInput): Promise<SimulationResult | null>;
export {};
//# sourceMappingURL=simulateUnknownTx.d.ts.map