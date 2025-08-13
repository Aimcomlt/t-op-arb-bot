import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests for core initialization routine and high level arb planner pipeline

describe('initT_OP_Bot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('initializes services and broadcasts token metadata', async () => {
    const collectPairs = vi.fn().mockResolvedValue([
      { token0: 'a', token1: 'b', pairAddress: '0x1', dex: 'uni' }
    ]);
    const normalizePairs = vi.fn().mockReturnValue([
      { tokenA: 'a', tokenB: 'b', pairAddress: '0x1', dex: 'uni', key: 'a_b' }
    ]);
    const consolidateTokenMeta = vi.fn().mockResolvedValue({
      a: { address: 'a', symbol: 'A', decimals: 18 },
      b: { address: 'b', symbol: 'B', decimals: 18 }
    });
    const startBroadcastServer = vi.fn();
    const broadcastState = vi.fn();

    vi.doMock('@blazing/core/dex/dexCollector', () => ({ collectPairs }));
    vi.doMock('@blazing/core/core/pairFormatter', () => ({ normalizePairs }));
    vi.doMock('@blazing/core/core/metaConsolidator', () => ({ consolidateTokenMeta }));
    vi.doMock('@blazing/core/ws/broadcaster', () => ({ startBroadcastServer, broadcastState }));

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as any);

    await import('@blazing/core/core/initT_OP_Bot');
    await new Promise((resolve) => setImmediate(resolve));

    expect(startBroadcastServer).toHaveBeenCalled();
    expect(collectPairs).toHaveBeenCalled();
    expect(normalizePairs).toHaveBeenCalledWith([
      { token0: 'a', token1: 'b', pairAddress: '0x1', dex: 'uni' }
    ]);
    expect(consolidateTokenMeta).toHaveBeenCalledWith([
      { tokenA: 'a', tokenB: 'b', pairAddress: '0x1', dex: 'uni', key: 'a_b' }
    ]);
    expect(broadcastState).toHaveBeenCalledWith({
      a: { address: 'a', symbol: 'A', decimals: 18 },
      b: { address: 'b', symbol: 'B', decimals: 18 }
    });
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('exits process when initialization fails', async () => {
    const collectPairs = vi.fn().mockRejectedValue(new Error('boom'));
    const startBroadcastServer = vi.fn();

    vi.doMock('@blazing/core/dex/dexCollector', () => ({ collectPairs }));
    vi.doMock('@blazing/core/core/pairFormatter', () => ({ normalizePairs: vi.fn() }));
    vi.doMock('@blazing/core/core/metaConsolidator', () => ({ consolidateTokenMeta: vi.fn() }));
    vi.doMock('@blazing/core/ws/broadcaster', () => ({ startBroadcastServer, broadcastState: vi.fn() }));

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as any);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('@blazing/core/core/initT_OP_Bot');
    await new Promise((resolve) => setImmediate(resolve));

    expect(startBroadcastServer).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('postSyncHooks (arb planner)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('builds strategy and executes when opportunity is viable', async () => {
    const log: any = { dummy: 'log' };
    const syncTrace = {
      pairSymbol: 'ETH/USDC',
      dex: 'uni',
      reservesAfter: [1, 2],
      timestamp: 123
    };

    const buildSyncTrace = vi.fn().mockResolvedValue(syncTrace);
    const spread = {
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      spread: 0.01,
      buyOn: 'uni',
      sellOn: 'sushi',
      estimatedProfit: 42
    };
    const scanDiscrepancy = vi.fn().mockResolvedValue(spread);
    const profitGuard = vi.fn().mockReturnValue(true);
    const buildCalldata = vi.fn().mockResolvedValue('0x');
    const dryRun = vi.fn().mockResolvedValue({ txHash: '0x', status: 'success' });
    const strategy = { shouldExecute: true, reason: null, buildCalldata, dryRun };
    const strategyBuilder = vi.fn().mockReturnValue(strategy);
    const postExecutionHooks = vi.fn();
    const emitSyncEvent = vi.fn();
    const emitArbOpportunity = vi.fn();

    vi.doMock('@blazing/core/tracing/buildSyncTrace', () => ({ buildSyncTrace }));
    vi.doMock('@blazing/core/core/scanDiscrepancy', () => ({ scanDiscrepancy }));
    vi.doMock('@blazing/core/core/strategyBuilder', () => ({ strategyBuilder }));
    vi.doMock('@blazing/core/utils/profitGuard', () => ({ profitGuard }));
    vi.doMock('@blazing/core/hooks/postExecutionHooks', () => ({ postExecutionHooks }));
    vi.doMock('@blazing/core/abie/broadcaster/broadcastHooks', () => ({
      emitSyncEvent,
      emitArbOpportunity
    }));

    const { postSyncHooks } = await import('@blazing/core/hooks/postSyncHooks');
    await postSyncHooks(log);

    expect(buildSyncTrace).toHaveBeenCalledWith(log);
    expect(emitSyncEvent).toHaveBeenCalledWith({
      pairSymbol: syncTrace.pairSymbol,
      dex: syncTrace.dex,
      reserves: {
        reserve0: String(syncTrace.reservesAfter[0]),
        reserve1: String(syncTrace.reservesAfter[1])
      },
      timestamp: syncTrace.timestamp
    });
    expect(scanDiscrepancy).toHaveBeenCalledWith(syncTrace);
    expect(emitArbOpportunity).toHaveBeenCalledWith({
      tokenIn: spread.tokenIn,
      tokenOut: spread.tokenOut,
      spread: String(spread.spread),
      buyOn: spread.buyOn,
      sellOn: spread.sellOn,
      estimatedProfit: String(spread.estimatedProfit)
    });
    expect(profitGuard).toHaveBeenCalledWith({
      expectedProceeds: BigInt(Math.floor(spread.estimatedProfit ?? 0)),
      gasCost: 0n,
      flashFee: 0n,
    });
    expect(strategyBuilder).toHaveBeenCalledWith(syncTrace, spread);
    expect(buildCalldata).toHaveBeenCalled();
    expect(dryRun).toHaveBeenCalled();
    expect(postExecutionHooks).toHaveBeenCalledWith({ strategy, result: { txHash: '0x', status: 'success' } });
  });

  it('returns early when no spread is found', async () => {
    const log: any = { dummy: 'log' };
    const syncTrace = {
      pairSymbol: 'ETH/USDC',
      dex: 'uni',
      reservesAfter: [1, 2],
      timestamp: 123
    };

    const buildSyncTrace = vi.fn().mockResolvedValue(syncTrace);
    const scanDiscrepancy = vi.fn().mockResolvedValue(null);
    const profitGuard = vi.fn();
    const strategyBuilder = vi.fn();
    const postExecutionHooks = vi.fn();
    const emitSyncEvent = vi.fn();
    const emitArbOpportunity = vi.fn();

    vi.doMock('@blazing/core/tracing/buildSyncTrace', () => ({ buildSyncTrace }));
    vi.doMock('@blazing/core/core/scanDiscrepancy', () => ({ scanDiscrepancy }));
    vi.doMock('@blazing/core/core/strategyBuilder', () => ({ strategyBuilder }));
    vi.doMock('@blazing/core/utils/profitGuard', () => ({ profitGuard }));
    vi.doMock('@blazing/core/hooks/postExecutionHooks', () => ({ postExecutionHooks }));
    vi.doMock('@blazing/core/abie/broadcaster/broadcastHooks', () => ({
      emitSyncEvent,
      emitArbOpportunity
    }));

    const { postSyncHooks } = await import('@blazing/core/hooks/postSyncHooks');
    await postSyncHooks(log);

    expect(emitArbOpportunity).not.toHaveBeenCalled();
    expect(profitGuard).not.toHaveBeenCalled();
    expect(strategyBuilder).not.toHaveBeenCalled();
    expect(postExecutionHooks).not.toHaveBeenCalled();
  });
});
