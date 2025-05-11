// src/core/metaConsolidator.ts

/**
 * Builds a token metadata map from canonical LP pairs.
 * Optionally fetches symbol/decimals via onchain fallback.
 */

import { ethers } from 'ethers';
import { CanonicalPair } from './pairFormatter';

const ERC20_ABI = [
  { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const;

const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_MAINNET || '');

export interface TokenMeta {
  address: string;
  symbol: string;
  decimals: number;
}

export async function consolidateTokenMeta(pairs: CanonicalPair[]): Promise<Record<string, TokenMeta>> {
  const tokenMap: Record<string, TokenMeta> = {};

  for (const pair of pairs) {
    for (const address of [pair.tokenA, pair.tokenB]) {
      if (tokenMap[address]) continue;

      try {
        const token = new ethers.Contract(address, ERC20_ABI, provider);
        const [symbol, decimals] = await Promise.all([
          token.symbol(),
          token.decimals()
        ]);

        tokenMap[address] = {
          address,
          symbol,
          decimals,
        };
      } catch (err) {
        console.warn(`[metaConsolidator] Failed to fetch token info for ${address}:`, err);
        tokenMap[address] = {
          address,
          symbol: 'UNKNOWN',
          decimals: 18, // fallback assumption
        };
      }
    }
  }

  return tokenMap;
}
