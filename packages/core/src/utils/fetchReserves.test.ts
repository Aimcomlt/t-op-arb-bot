import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('fetchReserves', () => {
  it('uses multicall and caches per block', async () => {
    const multicallMock = vi.fn().mockResolvedValue([
      [1n, 2n, 0n],
      [3n, 4n, 0n],
    ]);
    vi.doMock('../clients/viemClient', () => ({
      publicClient: { multicall: multicallMock },
    }));

    const { fetchReserves, clearReserveCache } = await import('./fetchReserves.js');
    clearReserveCache();

    const pools = ['0x1', '0x2'] as const;
    const res1 = await fetchReserves(
      pools as readonly `0x${string}`[],
      { blockNumber: 1n },
    );
    expect(multicallMock).toHaveBeenCalledTimes(1);
    expect(res1).toEqual({
      '0x1': [1n, 2n],
      '0x2': [3n, 4n],
    });

    const res2 = await fetchReserves(
      pools as readonly `0x${string}`[],
      { blockNumber: 1n },
    );
    expect(multicallMock).toHaveBeenCalledTimes(1); // cached
    expect(res2).toEqual(res1);
  });
});
