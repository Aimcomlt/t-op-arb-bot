// src/abie/simulation/simulateUnknownTx.ts

import { viemClient } from "../../clients/viemClient.js";
import { decodeSelector } from "../../utils/decodeSelector.js";
import { decodeRawArgsHex } from "../../utils/decodeRawArgsHex.js";
import { fetchAbiSignature } from "../../utils/fetchAbiSignature.js";
import type { TraceResult } from '@t-op-arb-bot/types';
import { parseTrace } from "../../utils/traceParsers.js";

interface SimulationInput {
  txHash: string;
}

export async function simulateUnknownTx({ txHash }: SimulationInput): Promise<TraceResult | null> {
  try {
    const trace = await viemClient.debug_traceTransaction({
      hash: txHash,
      tracer: "callTracer"
    });

    const callData = trace?.calls?.[0]?.input || trace?.input;

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

    // Wrap output for postExecutionHooks
    const parsedTrace = parseTrace(trace, decoded);

    return parsedTrace;

  } catch (error) {
    console.error(`simulateUnknownTx failed for ${txHash}:`, error);
    return null;
  }
}
