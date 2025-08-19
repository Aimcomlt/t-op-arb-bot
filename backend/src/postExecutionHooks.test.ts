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
    const postExecutionHooks = await import('@blazing/core/hooks/postExecutionHooks.js');
    const { logToDatabase } = await import('@blazing/core/utils/dbLogger.js');
    const hooks = await import('@blazing/core/abie/broadcaster/broadcastHooks.js');
    const { updateSlippageTolerance } = await import('@blazing/core/config/arbitrageConfig.js');
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx.js');
    const { formatTraceForLogs } = await import('@blazing/core/utils/formatTraceForLogs.js');

    (simulateUnknownTx as any).mockResolvedValue({ trace: {}, profit: null });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await postExecutionHooks.onExecutionSuccess({
      txHash: '0xabc',
      pair: 'ETH/USDT',
      route: ['A', 'B'],
      profit: '1',
      gasUsed: '21000',
      trace: {},
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
    const postExecutionHooks = await import('@blazing/core/hooks/postExecutionHooks.js');
    const hooks = await import('@blazing/core/abie/broadcaster/broadcastHooks.js');
    const { updateSlippageTolerance } = await import('@blazing/core/config/arbitrageConfig.js');
    const { simulateUnknownTx } = await import('@blazing/core/abie/simulation/simulateUnknownTx.js');

    const args = {
      strategy: {
        pairSymbol: 'ETH/USDT',
        route: ['A', 'B'],
        shouldExecute: true,
        reason: 'test',
        buildCalldata: vi.fn(),
        dryRun: vi.fn()
      },
      result: { txHash: '0xabc', status: 'reverted', gasUsed: '0' }
    };

    (simulateUnknownTx as any).mockResolvedValue(null);

    await postExecutionHooks.onExecutionRevert({
      pair: 'ETH/USDT',
      route: ['A', 'B'],
      reason: 'Trade reverted'
    });

    expect(updateSlippageTolerance).not.toHaveBeenCalled();
    expect(hooks.emitRevertAlert).toHaveBeenCalledWith({
      reason: 'Trade reverted',
      context: { pair: 'ETH/USDT', "route": "A -> B", }
    });
  });
});
