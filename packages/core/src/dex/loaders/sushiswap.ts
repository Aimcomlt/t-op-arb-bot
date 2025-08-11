// src/dex/loaders/sushiswap.ts

/**
 * Fetches LP pairs from the SushiSwap V2 factory onchain.
 * Mirrors Uniswap V2 logic but points to Sushi's factory + ABI.
 */

import { JsonRpcProvider, Contract } from 'ethers';
import { SUSHISWAP_FACTORY_ABI } from '../../abi-cache/FACTORY/sushiswapV2Factory';
import { SUSHISWAP_PAIR_ABI } from '../../abi-cache/PAIR/sushiswapV2Pair';
import { RawLP } from '../dexCollector';

const SUSHISWAP_FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'; // SushiSwap V2 Factory
const RPC_URL = process.env.INFURA_MAINNET || '';

const provider = new JsonRpcProvider(RPC_URL);

export async function fetchSushiPairs(limit = 200): Promise<RawLP[]> {
  const factory = new Contract(
    SUSHISWAP_FACTORY_ADDRESS,
    SUSHISWAP_FACTORY_ABI,
    provider
  );

  const pairCount: number = await factory.allPairsLength();
  const pairs: RawLP[] = [];

  const max = Math.min(limit, pairCount);

  for (let i = 0; i < max; i++) {
    try {
      const pairAddress = await factory.allPairs(i);
      const pair = new Contract(pairAddress, SUSHISWAP_PAIR_ABI, provider);

      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      pairs.push({
        token0,
        token1,
        pairAddress,
        dex: 'SushiSwap',
      });
    } catch (err) {
      console.warn(`[sushiswap] Failed to load pair #${i}:`, err);
    }
  }

  return pairs;
}
