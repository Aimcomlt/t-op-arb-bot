// packages/core/src/clients/debugTrace.ts
// Lightweight wrapper for debug_traceTransaction to avoid viem's strict typing on client.request
// Use only in dev/simulation paths.

export type DebugTraceOptions = {
  tracer?: string;
  timeout?: string;
  // Add other fields supported by your node if needed
};

export async function debugTraceTransaction(
  client: any, // viem PublicClient-like
  txHash: `0x${string}`,
  options: DebugTraceOptions = {}
) {
  const res = await (client as any).request({
    method: 'debug_traceTransaction' as any,
    params: [txHash, options] as any
  });
  return res as unknown;
}

export type ViemTraceCall = {
  type?: string;
  from?: `0x${string}`;
  to?: `0x${string}`;
  input?: `0x${string}`;
  calls?: ViemTraceCall[];
  [k: string]: unknown;
};

export function isTraceCall(x: unknown): x is ViemTraceCall {
  return !!x && typeof x === 'object' && (
    'type' in (x as any) ||
    'input' in (x as any) ||
    'calls' in (x as any)
  );
}
