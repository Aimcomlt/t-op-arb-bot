// src/abi-cache/ROUTER/sushiswapV2Router.ts

/**
 * SushiSwap V2 Router ABI
 * Identical to Uniswap V2 — used for token swap calls and pricing
 */

export const SUSHISWAP_ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const;
