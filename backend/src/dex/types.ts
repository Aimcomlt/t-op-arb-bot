// Canonical, minimal surface the rest of the backend expects.
export type DexId = 'uniswap' | 'sushiswap';

export type Token = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

export type PairDescriptor = {
  dex: DexId;
  lpAddress: `0x${string}`;
  token0: Token;
  token1: Token;
};

export type PairList = PairDescriptor[];

// Utility: normalize token ordering (by address asc) for cross-DEX matching.
export function canonicalTokenKey(t0: Token, t1: Token): string {
  const [a0, a1] = [t0.address.toLowerCase(), t1.address.toLowerCase()];
  return a0 < a1 ? `${a0}:${a1}` : `${a1}:${a0}`;
}
