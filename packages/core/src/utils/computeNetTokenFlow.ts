import type { Hex } from "viem";

interface TraceCall {
  from: string;
  to: string;
  input: Hex;
}

/**
 * Aggregates ERC-20 transfer/transferFrom calls and computes net token
 * flow from the executor's perspective. Positive values indicate tokens
 * received by the executor, negative values indicate tokens sent.
 */
export function computeNetTokenFlow(
  calls: TraceCall[],
  executor: string
): Map<string, bigint> {
  const flows = new Map<string, bigint>();
  const exec = executor.toLowerCase();

  for (const call of calls) {
    if (!call.input) continue;
    const input = call.input.toLowerCase();
    const selector = input.slice(0, 10);
    const token = call.to.toLowerCase();

    if (selector === "0xa9059cbb") {
      // transfer(address,uint256)
      const to = "0x" + input.slice(34, 74);
      const amount = BigInt("0x" + input.slice(74, 138));
      let net = flows.get(token) || 0n;
      if (call.from.toLowerCase() === exec) net -= amount;
      if (to.toLowerCase() === exec) net += amount;
      flows.set(token, net);
    } else if (selector === "0x23b872dd") {
      // transferFrom(address,address,uint256)
      const from = "0x" + input.slice(34, 74);
      const to = "0x" + input.slice(98, 138);
      const amount = BigInt("0x" + input.slice(138, 202));
      let net = flows.get(token) || 0n;
      if (from.toLowerCase() === exec) net -= amount;
      if (to.toLowerCase() === exec) net += amount;
      flows.set(token, net);
    }
  }

  // Remove zero entries
  for (const [token, amt] of Array.from(flows.entries())) {
    if (amt === 0n) flows.delete(token);
  }

  return flows;
}
