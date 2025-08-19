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

export async function simulateUnknownTx(
  { txHash }: SimulationInput
): Promise<SimulationResult | null> {
  try {
    // Guard: ensure we have a definite hash (fixes string|undefined issues upstream)
    if (!txHash) return null;

    // Cache hit — return immediately
    const cached = traceCache.get(txHash) as SimulationResult | undefined;
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
    const rootInput: `0x${string}` = (trace.input ?? '0x') as `0x${string}`;
    const nested: DebugTraceCall[] = Array.isArray(trace.calls) ? trace.calls : [];

    const fromCandidates = [trace.from, ...nested.map((c) => c.from)].filter(Boolean) as `0x${string}`[];
    const txOrigin: Address =
      (fromCandidates[0] ?? '0x0000000000000000000000000000000000000000') as Address;

    // Calldata decoding
// Calldata decoding
const selector = rootInput.slice(0, 10) as `0x${string}`; // 0x + 8 hex
const rawArgs  = rootInput.slice(10) as string;

let decoded: { method: string; args: unknown[] } | null = decodeSelector(selector, rootInput);

if (!decoded) {
  const abiFromAPI = await fetchAbiSignature(selector);
  if (abiFromAPI) {
    decoded = decodeSelector(selector, rootInput, abiFromAPI);
  }
}

if (!decoded) {
  // decodeRawArgsHex likely returns any[] (or unknown[]).
  // Normalize it to your canonical shape so the type matches.
  const fallback = decodeRawArgsHex(rawArgs);
  const args: unknown[] = Array.isArray(fallback) ? fallback : (fallback == null ? [] : [fallback]);
  decoded = { method: selector, args };
}

    // Flatten nested calls and compute flows
    const flat = flattenCalls(nested);
    const flows: Map<string, bigint> = computeNetTokenFlow(flat, txOrigin);

    // Unique pool addresses (best-effort via `to`)
    const poolAddresses = Array.from(
      new Set(
        flat
          .map((c: unknown) => (isObject(c) ? (c as { to?: string }).to : undefined))
          .filter((a: unknown): a is `0x${string}` => typeof a === 'string')
      )
    );

    // If node provided a block number, use it for deterministic reads
    const blockNumber =
      (trace as any)?.blockNumber !== undefined
        ? BigInt((trace as any).blockNumber)
        : undefined;

    // Build reserves map: address -> [reserve0, reserve1]
    type ResTuple = readonly [bigint, bigint];

    const reservesEntries: ReadonlyArray<readonly [`0x${string}`, ResTuple]> =
      await Promise.all(
        poolAddresses.map(async (addr) => {
          const map = await fetchReserves([addr] as const, { blockNumber });
          const r = (map[addr] ?? [0n, 0n]) as ResTuple;
          return [addr, r] as const;
        })
      );

    const reserves: Record<`0x${string}`, ResTuple> =
      Object.fromEntries(reservesEntries) as Record<`0x${string}`, ResTuple>;

    // Quick profit proxy: largest positive flow by base-value
    let profit: { token: string; amount: bigint } | null = null;
    let maxBase = 0;
    for (const [token, amount] of flows.entries()) {
      if (amount <= 0n) continue;
      const price = await fetchTokenPrice(token); // number
      // NOTE: Number(bigint) can overflow for very large amounts; acceptable if your tokens are typical ERC-20 sizes.
      const baseValue = Number(amount) * price;
      if (baseValue > maxBase) {
        maxBase = baseValue;
        profit = { token, amount };
      }
    }

    // Estimate a safe flash loan size with constant-product approximation
    const [buyAddr, sellAddr] = poolAddresses;
    const zeroTuple: ResTuple = [0n, 0n];

    const buyRes: ResTuple = buyAddr ? (reserves[buyAddr] ?? zeroTuple) : zeroTuple;
    const sellRes: ResTuple = sellAddr ? (reserves[sellAddr] ?? zeroTuple) : zeroTuple;

    const safeLoanSize = computeSafeFlashLoanSize({
      buyPool:  { reserveIn: buyRes[0],  reserveOut: buyRes[1]  },
      sellPool: { reserveIn: sellRes[0], reserveOut: sellRes[1] },
      maxSlippageBps: 100,
    });

    // Wrap for downstream consumers
    const parsedTrace: TraceResult = await parseTrace(trace as any, decoded);

    // Fully-typed result object (no `{}` initializer)
    const result: SimulationResult = {
      trace: parsedTrace,
      profit,
      safeLoanSize,
    };

    // Cache and return
    traceCache.set(txHash, result);
    return result;
  } catch (error) {
    console.error(`simulateUnknownTx failed for ${txHash}:`, error);
    return null;
  }
}

/** Narrow 'object' */
function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
