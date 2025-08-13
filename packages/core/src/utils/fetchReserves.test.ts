import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('fetchReserves', () => {
  it('uses readContracts and caches per block', async () => {
    const readContractsMock = vi.fn().mockResolvedValue([
      [1n, 2n, 0n],
      [3n, 4n, 0n],
    ]);
    vi.doMock('../clients/viemClient', () => ({
      publicClient: { readContracts: readContractsMock },
    }));

    const { fetchReserves, clearReserveCache } = await import('./fetchReserves.js');
    clearReserveCache();

    const pools = ['0x1', '0x2'];
    const res1 = await fetchReserves(pools, 1n);
    expect(readContractsMock).toHaveBeenCalledTimes(1);
    expect(res1['0x1']).toEqual([1n, 2n]);

    const res2 = await fetchReserves(pools, 1n);
    expect(readContractsMock).toHaveBeenCalledTimes(1); // cached
    expect(res2['0x2']).toEqual([3n, 4n]);
  });
});
