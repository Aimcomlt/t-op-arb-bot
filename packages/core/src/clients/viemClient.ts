import { createPublicClient, http, type Address, type Chain } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545";
const CHAIN: Chain = mainnet;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

export const debugClient = {
  async traceTransaction(hash: `0x${string}`) {
    return publicClient.request({
      method: "debug_traceTransaction",
      params: [hash, { tracer: "callTracer" }],
    });
  },
};
