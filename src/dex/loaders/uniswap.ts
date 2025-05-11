// src/dex/loaders/uniswap.ts

/**
 * Fetches LP pairs directly from the Uniswap V2 factory onchain.
 * Uses type-safe ABI constants and returns normalized RawLP data.
 */

import { ethers } from 'ethers';
import { UNISWAP_FACTORY_ABI } from '../../abi-cache/FACTORY/uniswapV2Factory';
import { UNISWAP_PAIR_ABI } from '../../abi-cache/PAIR/uniswapV2Pair';
import { RawLP } from '../dexCollector';

const UNISWAP_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // Uniswap V2 Factory
const RPC_URL = process.env.INFURA_MAINNET || ''; // Use .env for config

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

export async function fetchUniPairs(limit = 200): Promise<RawLP[]> {
  const factory = new ethers.Contract(
    UNISWAP_FACTORY_ADDRESS,
    UNISWAP_FACTORY_ABI,
    provider
  );

  const pairCount: number = await factory.allPairsLength();
  const pairs: RawLP[] = [];

  const max = Math.min(limit, pairCount);

  for (let i = 0; i < max; i++) {
    try {
      const pairAddress = await factory.allPairs(i);
      const pair = new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, provider);

      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      pairs.push({
        token0,
        token1,
        pairAddress,
        dex: 'Uniswap',
      });
    } catch (err) {
      console.warn(`[uniswap] Failed to load pair #${i}:`, err);
    }
  }

  return pairs;
}
