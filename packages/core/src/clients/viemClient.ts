// packages/core/src/clients/viemClient.ts
import { createPublicClient, http, type Chain } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
const CHAIN: Chain = mainnet;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

// --- Debug trace wrapper -----------------------------------------------------

export type DebugTraceOptions = {
  tracer?: string;   // e.g., "callTracer"
  timeout?: string;  // e.g., "5s"
  // add other client-specific options if you use them
};

/**
 * Calls the node's debug_traceTransaction using a laxly-typed request.
 * Return is `unknown` on purpose; always narrow at the call site.
 */
export async function debugTraceTransaction(
  hash: `0x${string}`,
  opts: DebugTraceOptions = {}
): Promise<unknown> {
  // viem's client.request is strictly typed and excludes debug_* methods.
  // We intentionally cast to any here to bypass the type whitelist.
  return (publicClient as any).request({
    method: "debug_traceTransaction" as any,
    params: [hash, opts] as any,
  });
}

/** Optional convenience wrapper mirroring your previous API. */
export const debugClient = {
  async traceTransaction(hash: `0x${string}`) {
    // Use a default tracer if you want call frames
    return debugTraceTransaction(hash, { tracer: "callTracer", timeout: "5s" });
  },
};
