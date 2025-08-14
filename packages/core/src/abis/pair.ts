// packages/core/src/abis/pair.ts
// Minimal UniswapV2/SushiV2 Pair ABI used by this project.
// NodeNext: import with ".js" even though this file is .ts.

export const PAIR_ABI = [
  // reserves: returns (reserve0, reserve1, blockTimestampLast)
  {
    "name": "getReserves",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "reserve0", "type": "uint112" },
      { "name": "reserve1", "type": "uint112" },
      { "name": "blockTimestampLast", "type": "uint32" }
    ]
  },

  // optional helpers (uncomment if you need them elsewhere)
  // { "name": "token0", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
  // { "name": "token1", "type": "function", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] }
] as const;
