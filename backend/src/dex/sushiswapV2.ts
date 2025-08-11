import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { PairList, Token } from './types';
import { sleep, mapLimit } from '../utils/async';
import { fetchTokenMeta } from './tokenMeta';

import { SUSHISWAP_FACTORY_ABI } from '../abi-cache/FACTORY/sushiswapV2Factory';
import { SUSHISWAP_PAIR_ABI } from '../abi-cache/PAIR/sushiswapV2Pair';

// Mainnet Sushiswap V2 factory address:
const SUSHI_FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac' as const;

// Env knobs (with safe fallbacks)
const MAX_PAIRS: number = (env as any).MAX_PAIRS ?? 50;
const COLLECT_CONCURRENCY: number = (env as any).COLLECT_CONCURRENCY ?? 2;
const CHUNK_DELAY_MS: number = (env as any).CHUNK_DELAY_MS ?? 500;
const START_INDEX: number = (env as any).START_INDEX ?? 0;

type PairTokenAddrs = { lpAddress: `0x${string}`; t0: `0x${string}`; t1: `0x${string}` };
type Enriched = { lpAddress: `0x${string}`; token0: Token; token1: Token };

const WETH: Token = {
  address: env.WETH_ADDRESS as `0x${string}`,
  symbol: 'WETH',
  decimals: 18,
};

// Retry helper with gentle backoff for 429 / transient errors
async function withRetries<T>(fn: () => Promise<T>, label: string, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRate = e?.info?.error?.code === 429;
      const isCallEx = e?.code === 'CALL_EXCEPTION' || e?.code === 'BAD_DATA';
      if (!isRate && !isCallEx) throw e;
      if (attempt === maxAttempts) throw e;
      const delay = 200 * attempt;
      logger.warn({ attempt, delay, label, reason: isRate ? '429' : e?.code }, '[SUSHI] retrying');
      await sleep(delay);
    }
  }
  throw new Error(`withRetries exhausted: ${label}`);
}

// Type guard helpers
function hasWeth(x: PairTokenAddrs | null): x is PairTokenAddrs {
  return x !== null;
}
function isEnriched(x: Enriched | null): x is Enriched {
  return x !== null;
}

export async function collectSushiPairs(
  provider = new ethers.JsonRpcProvider(env.RPC_HTTP_URL)
): Promise<PairList> {
  const factory = new ethers.Contract(SUSHI_FACTORY_ADDRESS, SUSHISWAP_FACTORY_ABI, provider);

  const totalPairs = Number(
    await withRetries(() => factory.allPairsLength(), 'factory.allPairsLength')
  );

  const start = Math.max(0, START_INDEX);
  const max = Math.min(MAX_PAIRS, Math.max(0, totalPairs - start));
  const endExclusive = start + max;

  logger.info({ totalPairs, start, endExclusive, max, cc: COLLECT_CONCURRENCY }, '[SUSHI] planning collection');
  if (max === 0) {
    logger.warn('[SUSHI] max=0; nothing to collect');
    return [];
  }

  const idxs = Array.from({ length: max }, (_, k) => start + k);

  // 1) LP addresses (throttled + retried)
  const lpAddrs = (await mapLimit(idxs, COLLECT_CONCURRENCY, async (i) =>
    withRetries(() => factory.allPairs(i), `factory.allPairs(${i})`)
  )) as string[];

  // 2) token0/token1 addresses (throttled + retried, WETH-filtered)
  const pairsTokenAddrsRaw = await mapLimit<string, PairTokenAddrs | null>(
    lpAddrs,
    COLLECT_CONCURRENCY,
    async (addr) => {
      const pair = new ethers.Contract(addr, SUSHISWAP_PAIR_ABI, provider);
      const [t0Addr, t1Addr] = await withRetries(
        () => Promise.all([pair.token0(), pair.token1()]),
        `pair.token0/1(${addr})`
      );
      const t0IsWeth = t0Addr.toLowerCase() === env.WETH_ADDRESS.toLowerCase();
      const t1IsWeth = t1Addr.toLowerCase() === env.WETH_ADDRESS.toLowerCase();
      if (!t0IsWeth && !t1IsWeth) return null;
      return { lpAddress: addr as `0x${string}`, t0: t0Addr as `0x${string}`, t1: t1Addr as `0x${string}` };
    }
  );

  const pairsTokenAddrs = pairsTokenAddrsRaw.filter(hasWeth);

  // 3) Enrich with robust token metadata (only non-WETH lookups)
  const enriched = await mapLimit<PairTokenAddrs, Enriched | null>(
    pairsTokenAddrs,
    COLLECT_CONCURRENCY,
    async (p) => {
      try {
        const t0IsWeth = p.t0.toLowerCase() === env.WETH_ADDRESS.toLowerCase();
        const t1IsWeth = p.t1.toLowerCase() === env.WETH_ADDRESS.toLowerCase();
        const token0P = t0IsWeth ? Promise.resolve(WETH) : fetchTokenMeta(p.t0, provider);
        const token1P = t1IsWeth ? Promise.resolve(WETH) : fetchTokenMeta(p.t1, provider);
        const [token0, token1] = await Promise.all([token0P, token1P]);
        return { lpAddress: p.lpAddress, token0, token1 };
      } catch (err) {
        logger.warn({ lp: p.lpAddress, err: String(err) }, '[SUSHI] skip LP (meta failed)');
        return null;
      }
    }
  );

  if (CHUNK_DELAY_MS > 0) await sleep(CHUNK_DELAY_MS);

  // 4) Build PairList, dropping failed enrichments
  const pairs: PairList = enriched
    .filter(isEnriched)
    .map((p) => ({
      dex: 'sushiswap' as const,
      lpAddress: p.lpAddress,
      token0: p.token0,
      token1: p.token1,
    }));

  logger.info({ selected: pairs.length, start, endExclusive }, '[SUSHI] collected (throttled)');
  return pairs;
}
