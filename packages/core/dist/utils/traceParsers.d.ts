import type { TraceResult } from '@t-op-arb-bot/types';
interface ViemTraceCall {
    from: string;
    to: string;
    input: string;
    gas: string;
    gasUsed: string;
    value: string;
    calls?: ViemTraceCall[];
}
export declare function parseTrace(trace: ViemTraceCall, decoded?: any): Promise<TraceResult>;
export {};
//# sourceMappingURL=traceParsers.d.ts.map