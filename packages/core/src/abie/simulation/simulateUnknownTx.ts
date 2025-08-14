// packages/core/src/abie/simulation/simulateUnknownTx.ts

// Value vs type imports (verbatimModuleSyntax safe)
import { debugTraceTransaction, isTraceCall } from '@/clients/debugTrace.js';
import type { ViemTraceCall as DebugTraceCall } from '@/clients/debugTrace.js';

import { debugClient } from '../../clients/viemClient.js';
import { decodeSelector } from '../../utils/decodeSelector.js';
import { decodeRawArgsHex } from '../../utils/decodeRawArgsHex.js';
import { fetchAbiSignature } from '../../utils/fetchAbiSignature.js';
import type { TraceResult } from '@t-op-arb-bot/types';
import { parseTrace } from '../../utils/traceParsers.js';
import { traceCache } from '../../utils/traceCache.js';
import { computeNetTokenFlow } from '../../utils/computeNetTokenFlow.js';
import type { Address } from 'viem';
import { fetchTokenPrice } from '../../utils/fetchTokenPrice.js';
import { computeSafeFlashLoanSize } from '../../utils/flashLoanSizing.js';
import { fetchReserves } from '../../utils/fetchReserves.js';

interface SimulationInput {
  txHash: string;
}

export interface SimulationResult {
  trace: TraceResult;
  profit: { token: string; amount: bigint } | null;
  safeLoanSize: bigint;
}

/** DFS flatten of nested calls */
function flattenCalls(calls: any[] = []): any[] {
  const out: any[] = [];
  const dfs = (c: any) => {
    out.push(c);
    if (Array.isArray(c?.calls)) c.calls.forEach(dfs);
  };
  calls.forEach(dfs);
  return out;
}

export async function simulateUnknownTx({ txHash }: SimulationInput): Promise<SimulationResult | null> {
  try {
    // cache hit — return immediately
    const cached = traceCache.get(txHash);
    if (cached) return cached;

    // Raw node debug trace (untyped at viem level)
    const traceUnknown = await debugTraceTransaction(
      debugClient as any,
      txHash as `0x${string}`,
      { timeout: '5s' }
    );

    // Narrow to the shape we expect
    if (!isTraceCall(traceUnknown)) {
      throw new Error('Unexpected trace shape from debug_traceTransaction');
    }
    const trace: DebugTraceCall = traceUnknown;

    // Access guarded fields
    const rootInput = trace.input ?? '0x';
    const nested: DebugTraceCall[] = Array.isArray(trace.calls) ? trace.calls : [];
    const fromCandidates = [trace.from, ...nested.map((c) => c.from)].filter(Boolean) as `0x${string}`[];
    const txOrigin = (fromCandidates[0] ?? '0x0000000000000000000000000000000000000000') as Address;

    // Calldata decoding
    const selector = rootInput.slice(0, 10);  // 0x + 8 hex
    const rawArgs  = rootInput.slice(10);

    let decoded = decodeSelector(selector, rootInput);
    if (!decoded) {
      const abiFromAPI = await fetchAbiSignature(selector);
      decoded = abiFromAPI
        ? decodeSelector(selector, rootInput, abiFromAPI)
        : decodeRawArgsHex(rawArgs);
    }

    // Flatten nested calls and compute flows
    const flat = flattenCalls(nested);
    const flows = computeNetTokenFlow(flat, txOrigin);

    // Unique pool addresses (best-effort via `to`)
    const poolAddresses = Array.from(
      new Set(flat.map((c: any) => c?.to).filter(Boolean))
    ) as `0x${string}`[];

    // If node provided a block number, use it for deterministic reads
    const blockNumber =
      (trace as any)?.blockNumber !== undefined
        ? BigInt((trace as any).blockNumber)
        : undefined;

    // Build reserves map: address -> [reserve0, reserve1]
    // fetchReserves expects an array; we call per address and assemble entries.
    type ResTuple = readonly [bigint, bigint];
    const reservesEntries: Array<readonly [`0x${string}`, ResTuple]> = await Promise.all(
      poolAddresses.map(async (addr) => {
        const map = await fetchReserves([addr] as const, { blockNumber });
        const r = (map[addr] ?? [0n, 0n]) as ResTuple;
        return [addr, r] as const;
      })
    );

    const reserves = Object.fromEntries(reservesEntries) as Record<
      `0x${string}`,
      ResTuple
    >;

    // Quick profit proxy: largest positive flow by base-value
    let profit: { token: string; amount: bigint } | null = null;
    let maxBase = 0;
    for (const [token, amount] of flows.entries()) {
      if (amount <= 0n) continue;
      const price = await fetchTokenPrice(token); // number
      const baseValue = Number(amount) * price;
      if (baseValue > maxBase) {
        maxBase = baseValue;
        profit = { token, amount };
      }
    }

    // Estimate a safe flash loan size with constant-product approximation
    const [buyAddr, sellAddr] = poolAddresses;
    const buyRes  = buyAddr  ? reserves[buyAddr]  ?? [0n, 0n] : [0n, 0n] as const;
    const sellRes = sellAddr ? reserves[sellAddr] ?? [0n, 0n] : [0n, 0n] as const;

    const safeLoanSize = computeSafeFlashLoanSize({
      buyPool:  { reserveIn: buyRes[0],  reserveOut: buyRes[1]  },
      sellPool: { reserveIn: sellRes[0], reserveOut: sellRes[1] },
      maxSlippageBps: 100,
    });

    // Wrap for downstream consumers
    const parsedTrace: TraceResult = await parseTrace(trace as any, decoded);
    const result: SimulationResult = { trace: parsedTrace, profit, safeLoanSize };

    // cache and return
    traceCache.set(txHash, result);
    return result;
  } catch (error) {
    console.error(`simulateUnknownTx failed for ${txHash}:`, error);
    return null;
  }
}
