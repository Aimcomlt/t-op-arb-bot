import type { TraceResult } from '@t-op-arb-bot/types';
import type { DecodedCallData } from "@/types/decodedTypes.js";
interface ViemTraceCall {
    type: string;
    from: string;
    to: string;
    input: string;
    output?: string;
    gas: string;
    gasUsed: string;
    value: string;
    calls?: ViemTraceCall[];
}
export declare function parseTrace(rawTrace: ViemTraceCall, decoded?: DecodedCallData | string[]): TraceResult;
export {};
//# sourceMappingURL=parseTrace.d.ts.map