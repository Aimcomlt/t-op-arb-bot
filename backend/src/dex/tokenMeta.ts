import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { sleep } from '../utils/async.js';

export type TokenMeta = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

const cache = new Map<string, TokenMeta>();

async function withRetries<T>(fn: () => Promise<T>, label: string, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const rate = e?.info?.error?.code === 429;
      const transient = rate || e?.code === 'CALL_EXCEPTION' || e?.code === 'BAD_DATA';
      if (!transient || attempt === maxAttempts) throw e;
      const delay = 200 * attempt;
      // keep logs at warn, not error
      logger.warn({ attempt, delay, label, reason: rate ? '429' : e?.code }, '[TOKEN] retrying');
      await sleep(delay);
    }
  }
  // TS appeasement
  throw new Error(`withRetries exhausted: ${label}`);
}

function sanitizeSymbol(sym: string): string {
  return sym.replace(/\0/g, '').trim().slice(0, 32) || 'TKN';
}

export async function fetchTokenMeta(
  address: `0x${string}`,
  provider: ethers.Provider
): Promise<TokenMeta> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  let symbol = 'TKN';
  let decimals = 18;

  try {
    // Try string first
    const erc20Str = new ethers.Contract(address, ['function symbol() view returns (string)'], provider);
    const s = await withRetries(() => erc20Str.symbol(), `symbol(string) ${address}`);
    symbol = sanitizeSymbol(s);
  } catch {
    try {
      // Fallback bytes32
      const erc20B32 = new ethers.Contract(address, ['function symbol() view returns (bytes32)'], provider);
      const raw: string = await withRetries(() => erc20B32.symbol(), `symbol(bytes32) ${address}`);
      try {
        symbol = sanitizeSymbol(ethers.decodeBytes32String(raw));
      } catch {
        symbol = sanitizeSymbol(Buffer.from(raw.slice(2), 'hex').toString('ascii'));
      }
    } catch (e) {
      // Final fallback: short address tag
      symbol = `TKN:${address.slice(2, 6).toUpperCase()}`;
      logger.warn({ address, symbol }, '[TOKEN] symbol fallback');
    }
  }

  try {
    const erc20U8 = new ethers.Contract(address, ['function decimals() view returns (uint8)'], provider);
    decimals = await withRetries(() => erc20U8.decimals(), `decimals(uint8) ${address}`);
  } catch {
    try {
      const erc20U256 = new ethers.Contract(address, ['function decimals() view returns (uint256)'], provider);
      const d: bigint = await withRetries(() => erc20U256.decimals(), `decimals(uint256) ${address}`);
      decimals = Number(d);
    } catch (e) {
      decimals = 18;
      logger.warn({ address, fallback: 18 }, '[TOKEN] decimals fallback');
    }
  }

  const meta: TokenMeta = { address, symbol, decimals };
  cache.set(key, meta);
  return meta;
}
