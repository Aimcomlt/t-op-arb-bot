export type DebugTraceOptions = {
    tracer?: string;
    timeout?: string;
};
export declare function debugTraceTransaction(client: any, // viem PublicClient-like
txHash: `0x${string}`, options?: DebugTraceOptions): Promise<unknown>;
export type ViemTraceCall = {
    type?: string;
    from?: `0x${string}`;
    to?: `0x${string}`;
    input?: `0x${string}`;
    calls?: ViemTraceCall[];
    [k: string]: unknown;
};
export declare function isTraceCall(x: unknown): x is ViemTraceCall;
//# sourceMappingURL=debugTrace.d.ts.map