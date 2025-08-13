// src/abie/simulation/simulateUnknownTx.ts

import { viemClient } from "../../clients/viemClient.js";
import { decodeSelector } from "../../utils/decodeSelector.js";
import { decodeRawArgsHex } from "../../utils/decodeRawArgsHex.js";
import { fetchAbiSignature } from "../../utils/fetchAbiSignature.js";
import type { TraceResult } from '@t-op-arb-bot/types';
import { parseTrace } from "../../utils/traceParsers.js";
import { traceCache } from "../../utils/traceCache.js";
import { computeNetTokenFlow } from "../../utils/computeNetTokenFlow.js";
import { fetchTokenPrice } from "../../utils/fetchTokenPrice.js";

interface SimulationInput {
  txHash: string;
}

export interface SimulationResult {
  trace: TraceResult;
  profit: { token: string; amount: bigint } | null;
}

function flattenCalls(calls: any[] = []): any[] {
  const out: any[] = [];
  const dfs = (c: any) => {
    out.push(c);
    if (c.calls) c.calls.forEach(dfs);
  };
  calls.forEach(dfs);
  return out;
}

export async function simulateUnknownTx({ txHash }: SimulationInput): Promise<SimulationResult | null> {
  try {
    const cached = traceCache.get(txHash);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const trace = await viemClient.debug_traceTransaction({
      hash: txHash,
      tracer: "callTracer",
      signal: controller.signal
    });

    clearTimeout(timeout);

    const callData = trace?.input || trace?.calls?.[0]?.input;

    if (!callData) throw new Error("No calldata found in trace");

    const selector = callData.slice(0, 10);
    const rawArgs = callData.slice(10);

    // Try known ABI decoding
    let decoded = decodeSelector(selector, callData);
    
    if (!decoded) {
      // Try OpenChain fallback
      const abiFromAPI = await fetchAbiSignature(selector);
      if (abiFromAPI) {
        decoded = decodeSelector(selector, callData, abiFromAPI);
      } else {
        // Fallback to raw parsing
        decoded = decodeRawArgsHex(rawArgs);
      }
    }

    // Flatten calls and compute net token flow
    const flat = flattenCalls(trace.calls || []);
    const flows = computeNetTokenFlow(flat, trace.from);

    let profit: { token: string; amount: bigint } | null = null;
    let maxBase = 0;
    for (const [token, amount] of flows.entries()) {
      if (amount <= 0n) continue;
      const price = await fetchTokenPrice(token); // base token per token
      const baseValue = Number(amount) * price;
      if (baseValue > maxBase) {
        maxBase = baseValue;
        profit = { token, amount };
      }
    }

    // Wrap output for postExecutionHooks
    const parsedTrace = parseTrace(trace, decoded);
    const result: SimulationResult = { trace: parsedTrace, profit };

    traceCache.set(txHash, result);

    return result;

  } catch (error) {
    console.error(`simulateUnknownTx failed for ${txHash}:`, error);
    return null;
  }
}
