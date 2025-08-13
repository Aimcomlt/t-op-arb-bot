import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

beforeEach(() => {
  vi.resetModules();
  try {
    fs.unlinkSync(path.join(process.cwd(), 'trace-cache.json'));
  } catch {}
});

describe('simulateUnknownTx', () => {
  it('returns parsed trace on success', async () => {
    const debugTraceMock = vi.fn().mockResolvedValue({
      from: '0x1',
      to: '0x2',
      input: '0x12345678abcdef',
      calls: [{ from: '0x1', to: '0x2', input: '0x12345678abcdef' }]
    });
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    const decodeSelectorMock = vi.fn().mockReturnValue({ method: 'foo', args: ['bar'] });
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({ decodeSelector: decodeSelectorMock }));
    const decodeRawArgsHexMock = vi.fn().mockReturnValue(['arg']);
    vi.doMock('@blazing/core/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: decodeRawArgsHexMock }));
    const fetchAbiSignatureMock = vi.fn().mockResolvedValue(null);
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: fetchAbiSignatureMock }));
    const parsedTrace = { contract: '0x1', from: '0x2', method: 'foo', args: ['bar'], ethTransferred: '0', gasUsed: '0', input: '0x12345678abcdef', depth: 0, children: [] };
    const parseTraceMock = vi.fn().mockResolvedValue(parsedTrace);
    vi.doMock('@blazing/core/utils/traceParsers', () => ({ parseTrace: parseTraceMock }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));

    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(debugTraceMock).toHaveBeenCalled();
    expect(decodeSelectorMock).toHaveBeenCalled();
    expect(result?.trace).toBeTruthy();
    expect(result?.profit).toBeNull();
  });

  it('returns null and logs error on failure', async () => {
    const debugTraceMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({ decodeSelector: vi.fn() }));
    vi.doMock('@blazing/core/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: vi.fn() }));
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    vi.doMock('@blazing/core/utils/traceParsers', () => ({ parseTrace: vi.fn().mockResolvedValue({}) }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('aborts trace after timeout', async () => {
    vi.useFakeTimers();
    const debugTraceMock = vi.fn().mockImplementation(({ signal }) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({ decodeSelector: vi.fn(), registerSelector: vi.fn(), clearSelectorCache: vi.fn() }));
    vi.doMock('@blazing/core/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: vi.fn() }));
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    vi.doMock('@blazing/core/utils/traceParsers', () => ({ parseTrace: vi.fn().mockResolvedValue({}) }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));

    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const promise = simulateUnknownTx({ txHash: '0xabc' });
    vi.advanceTimersByTime(7000);
    const result = await promise;

    expect(result).toBeNull();
    expect(debugTraceMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('uses cached trace on subsequent calls', async () => {
    const debugTraceMock = vi.fn().mockResolvedValue({
      input: '0x12345678abcdef'
    });
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({ decodeSelector: () => ({ method: 'foo', args: [] }), registerSelector: vi.fn(), clearSelectorCache: vi.fn() }));
    vi.doMock('@blazing/core/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: vi.fn() }));
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    const parsedTrace = { contract: '0x1', from: '0x2', method: 'foo', args: [], ethTransferred: '0', gasUsed: '0', input: '0x12345678abcdef', depth: 0, children: [] };
    const parseTraceMock = vi.fn().mockResolvedValue(parsedTrace);
    vi.doMock('@blazing/core/utils/traceParsers', () => ({ parseTrace: parseTraceMock }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));
    const { traceCache } = await import('@blazing/core/utils/traceCache');
    traceCache.clear();

    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const first = await simulateUnknownTx({ txHash: '0xabc' });
    const second = await simulateUnknownTx({ txHash: '0xabc' });

    expect(second).toEqual(first);
  });

  it('decodes nested swaps with memoized selectors', async () => {
    const trace = {
      from: '0x1',
      to: '0x2',
      input: '0xaaaaaaaa00000000000000000000000000000000000000000000000000000001',
      gas: '0x0',
      gasUsed: '0x0',
      value: '0x0',
      calls: [
        {
          from: '0x2',
          to: '0x3',
          input: '0xbbbbbbbb00000000000000000000000000000000000000000000000000000002',
          gas: '0x0',
          gasUsed: '0x0',
          value: '0x0',
          calls: [
            {
              from: '0x3',
              to: '0x4',
              input: '0xbbbbbbbb00000000000000000000000000000000000000000000000000000003',
              gas: '0x0',
              gasUsed: '0x0',
              value: '0x0'
            }
          ]
        }
      ]
    };
    const debugTraceMock = vi.fn().mockResolvedValue(trace);
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));
    vi.doUnmock('@blazing/core/utils/traceParsers');
    vi.doUnmock('@blazing/core/utils/decodeRawArgsHex');

    const decodeSelectorMock = vi.fn((selector: string, callData: string) => {
      const map: Record<string, string> = {
        '0xaaaaaaaa': 'rootSwap',
        '0xbbbbbbbb': 'innerSwap'
      };
      const name = map[selector];
      return name ? { method: name, args: [callData.slice(10)] } : null;
    });
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({
      decodeSelector: decodeSelectorMock,
      registerSelector: vi.fn(),
      clearSelectorCache: vi.fn()
    }));

    const { traceCache } = await import('@blazing/core/utils/traceCache');
    traceCache.clear();
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(result.trace.method).toBe('rootSwap');
    expect(result.trace.children[0].method).toBe('innerSwap');
    expect(result.trace.children[0].children[0].method).toBe('innerSwap');
    expect(decodeSelectorMock).toHaveBeenCalledTimes(2);
  });

  it('aggregates token transfers and computes profit', async () => {
    const executor = '0x1111111111111111111111111111111111111111';
    const token = '0x2222222222222222222222222222222222222222';
    const other = '0x3333333333333333333333333333333333333333';

    const buildTransfer = (to: string, amount: bigint) => {
      return '0xa9059cbb' + to.replace('0x', '').padStart(64, '0') + amount.toString(16).padStart(64, '0');
    };

    const send = buildTransfer(other, 100n);
    const receive = buildTransfer(executor, 150n);

    const trace = {
      from: executor,
      input: '0x1234',
      calls: [
        { from: executor, to: token, input: send },
        { from: '0xaaaa', to: '0xbbbb', input: '0x', calls: [{ from: '0xbbbb', to: token, input: receive }] }
      ]
    } as any;

    const debugTraceMock = vi.fn().mockResolvedValue(trace);
    vi.doMock('@blazing/core/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('@blazing/core/utils/decodeSelector', () => ({ decodeSelector: vi.fn() }));
    vi.doMock('@blazing/core/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: vi.fn() }));
    vi.doMock('@blazing/core/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    vi.doMock('@blazing/core/utils/traceParsers', () => ({ parseTrace: vi.fn().mockResolvedValue({}) }));
    vi.doMock('@blazing/core/utils/fetchTokenPrice', () => ({ fetchTokenPrice: vi.fn().mockResolvedValue(1) }));
    vi.doMock('@blazing/core/utils/fetchReserves', () => ({ fetchReserves: vi.fn().mockResolvedValue({}) }));

    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(result?.profit).toEqual({ token: token.toLowerCase(), amount: 50n });
  });
});

