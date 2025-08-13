import type { Address, Hex } from "viem";

interface TraceCall {
  from: Address;
  to: Address;
  input: Hex;
}

export type TokenFlow = Map<Address, bigint>;

/**
 * Aggregates ERC-20 transfer/transferFrom calls and computes net token
 * flow from the executor's perspective. Positive values indicate tokens
 * received by the executor, negative values indicate tokens sent.
 */
export function computeNetTokenFlow(
  calls: TraceCall[],
  executor: Address
): TokenFlow {
  const flows: TokenFlow = new Map();
  const exec = executor.toLowerCase() as Address;

  for (const call of calls) {
    if (!call.input) continue;
    const input = call.input.toLowerCase();
    const selector = input.slice(0, 10);
    const token = call.to.toLowerCase() as Address;

    if (selector === "0xa9059cbb") {
      // transfer(address,uint256)
      const to = ("0x" + input.slice(34, 74)).toLowerCase() as Address;
      const amount = BigInt("0x" + input.slice(74, 138));
      const from = call.from.toLowerCase() as Address;
      let net = flows.get(token) || 0n;
      if (from === exec) net -= amount;
      if (to === exec) net += amount;
      flows.set(token, net);
    } else if (selector === "0x23b872dd") {
      // transferFrom(address,address,uint256)
      const from = ("0x" + input.slice(34, 74)).toLowerCase() as Address;
      const to = ("0x" + input.slice(98, 138)).toLowerCase() as Address;
      const amount = BigInt("0x" + input.slice(138, 202));
      let net = flows.get(token) || 0n;
      if (from === exec) net -= amount;
      if (to === exec) net += amount;
      flows.set(token, net);
    }
  }

  // Remove zero entries
  for (const [token, amt] of Array.from(flows.entries())) {
    if (amt === 0n) flows.delete(token);
  }

  return flows;
}
