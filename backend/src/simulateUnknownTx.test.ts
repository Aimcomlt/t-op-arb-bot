import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('simulateUnknownTx', () => {
  it('returns parsed trace on success', async () => {
    const debugTraceMock = vi.fn().mockResolvedValue({
      input: '0x12345678abcdef',
      calls: [{ input: '0x12345678abcdef' }]
    });
    vi.doMock('../../src/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    const decodeSelectorMock = vi.fn().mockReturnValue({ method: 'foo', args: ['bar'] });
    vi.doMock('../../src/utils/decodeSelector', () => ({ decodeSelector: decodeSelectorMock }));
    const decodeRawArgsHexMock = vi.fn().mockReturnValue(['arg']);
    vi.doMock('../../src/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: decodeRawArgsHexMock }));
    const fetchAbiSignatureMock = vi.fn().mockResolvedValue(null);
    vi.doMock('../../src/utils/fetchAbiSignature', () => ({ fetchAbiSignature: fetchAbiSignatureMock }));
    const parsedTrace = { contract: '0x1', from: '0x2', method: 'foo', args: ['bar'], ethTransferred: '0', gasUsed: '0', input: '0x12345678abcdef', depth: 0, children: [] };
    const parseTraceMock = vi.fn().mockReturnValue(parsedTrace);
    vi.doMock('../../src/utils/traceParsers', () => ({ parseTrace: parseTraceMock }));

    const { simulateUnknownTx } = await import('../../src/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(debugTraceMock).toHaveBeenCalled();
    expect(decodeSelectorMock).toHaveBeenCalled();
    expect(parseTraceMock).toHaveBeenCalledWith({ input: '0x12345678abcdef', calls: [{ input: '0x12345678abcdef' }] }, { method: 'foo', args: ['bar'] });
    expect(result).toEqual(parsedTrace);
  });

  it('returns null and logs error on failure', async () => {
    const debugTraceMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.doMock('../../src/clients/viemClient', () => ({
      viemClient: { debug_traceTransaction: debugTraceMock }
    }));
    vi.doMock('../../src/utils/decodeSelector', () => ({ decodeSelector: vi.fn() }));
    vi.doMock('../../src/utils/decodeRawArgsHex', () => ({ decodeRawArgsHex: vi.fn() }));
    vi.doMock('../../src/utils/fetchAbiSignature', () => ({ fetchAbiSignature: vi.fn() }));
    vi.doMock('../../src/utils/traceParsers', () => ({ parseTrace: vi.fn() }));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simulateUnknownTx } = await import('../../src/abie/simulation/simulateUnknownTx');
    const result = await simulateUnknownTx({ txHash: '0xabc' });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
