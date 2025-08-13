import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@blazing/core/utils/dbLogger', () => ({ logToDatabase: vi.fn() }));
vi.mock('@blazing/core/abie/broadcaster/broadcastHooks', () => ({
  emitExecutionResult: vi.fn(),
  emitRevertAlert: vi.fn(),
  emitSystemLog: vi.fn()
}));
vi.mock('@blazing/core/config/arbitrageConfig', () => ({ updateSlippageTolerance: vi.fn() }));
vi.mock('@blazing/core/abie/simulation/simulateUnknownTx', () => ({ simulateUnknownTx: vi.fn() }));
vi.mock('@blazing/core/utils/formatTraceForLogs', () => ({ formatTraceForLogs: vi.fn().mockReturnValue('formatted trace') }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('postExecutionHooks', () => {
  it('handles successful execution and logs trace', async () => {
    const { postExecutionHooks } = await import('@blazing/core/hooks/postExecutionHooks');
    const { logToDatabase } = await import('@blazing/core/utils/dbLogger');
    const hooks = await import('@blazing/core/abie/broadcaster/broadcastHooks');
    const { updateSlippageTolerance } = await import('@blazing/core/config/arbitrageConfig');
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');
    const { formatTraceForLogs } = await import('@blazing/core/utils/formatTraceForLogs');

    (simulateUnknownTx as any).mockResolvedValue({ trace: {}, profit: null });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await postExecutionHooks({
      strategy: { pairSymbol: 'ETH/USDT', route: ['A', 'B'] },
      result: { txHash: '0xabc', status: 'success', profitAchieved: '1', gasUsed: '21000' }
    });

    expect(logToDatabase).toHaveBeenCalled();
    expect(hooks.emitExecutionResult).toHaveBeenCalledWith({
      txHash: '0xabc',
      status: 'success',
      profit: '1',
      gasUsed: '21000'
    });
    expect(updateSlippageTolerance).toHaveBeenCalledWith('ETH/USDT', '1');
    expect(hooks.emitRevertAlert).not.toHaveBeenCalled();
    expect(simulateUnknownTx).toHaveBeenCalledWith({ txHash: '0xabc' });
    expect(formatTraceForLogs).toHaveBeenCalledWith({});
    expect(consoleLog).toHaveBeenCalled();
    expect(hooks.emitSystemLog).toHaveBeenCalled();
    consoleLog.mockRestore();
  });

  it('handles reverted execution and emits alert', async () => {
    const { postExecutionHooks } = await import('@blazing/core/hooks/postExecutionHooks');
    const hooks = await import('@blazing/core/abie/broadcaster/broadcastHooks');
    const { updateSlippageTolerance } = await import('@blazing/core/config/arbitrageConfig');
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx');

    (simulateUnknownTx as any).mockResolvedValue(null);

    await postExecutionHooks({
      strategy: { pairSymbol: 'ETH/USDT', route: ['A', 'B'] },
      result: { txHash: '0xabc', status: 'reverted', gasUsed: '0' }
    });

    expect(updateSlippageTolerance).not.toHaveBeenCalled();
    expect(hooks.emitRevertAlert).toHaveBeenCalledWith({
      reason: 'Trade reverted',
      context: { pair: 'ETH/USDT', route: ['A', 'B'] }
    });
  });
});
