// src/abie/simulation/simulateUnknownTx.ts

import { viemClient } from "../../clients/viemClient";
import { decodeSelector } from "../../utils/decodeSelector";
import { decodeRawArgsHex } from "../../utils/decodeRawArgsHex";
import { fetchAbiSignature } from "../../utils/fetchAbiSignature";
import { TraceResult } from "../../types/traceTypes";
import { parseTrace } from "../../utils/traceParsers";

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
