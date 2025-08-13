import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAbiSignature } from './fetchAbiSignature.js';
import { clearAbiCache } from './decodeSelector.js';

describe('fetchAbiSignature', () => {
  beforeEach(() => {
    clearAbiCache();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches from openchain and caches result', async () => {
    const selector = '0x12345678';
    const responseData = {
      result: {
        function: {
          [selector]: [
            {
              function: {
                name: 'foo',
                inputs: [{ name: 'bar', type: 'uint256' }],
                outputs: [],
                stateMutability: 'nonpayable',
              },
            },
          ],
        },
      },
    };

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => responseData } as any));
    vi.stubGlobal('fetch', fetchMock);

    const abi1 = await fetchAbiSignature(selector);
    expect(abi1).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const abi2 = await fetchAbiSignature(selector);
    expect(abi2).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1); // cached
  });

  it('falls back to 4byte when openchain fails', async () => {
    const selector = '0xdeadbeef';
    const fourByteData = {
      results: [{ text_signature: 'baz(uint256)' }],
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('openchain')) {
        return { ok: true, json: async () => ({ result: { function: {} } }) } as any;
      }
      return { ok: true, json: async () => fourByteData } as any;
    });

    vi.stubGlobal('fetch', fetchMock);

    const abi = await fetchAbiSignature(selector);
    expect(abi).toEqual(['function baz(uint256)']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
