import { beforeEach, describe, expect, it } from 'vitest';
import { useArbStore } from './useArbStore';

const samplePair = {
  pairSymbol: 'ETH/USDC',
  dex: 'uniswap' as const,
  lpAddress: '0x0000000000000000000000000000000000000000',
  reserves: { r0: '1', r1: '2', block: 1 },
  price: '100',
  liquidityUSD: '200',
  spread: '0',
  at: '2024-01-01T00:00:00Z',
};

describe('useArbStore', () => {
  beforeEach(() => {
    useArbStore.getState().reset();
  });

  it('ingest adds pair and updates order', () => {
    useArbStore.getState().ingest(samplePair);
    const state = useArbStore.getState();
    expect(state.rowsByKey['ETH/USDC:uniswap']).toBeDefined();
    expect(state.order).toEqual(['ETH/USDC:uniswap']);
  });

  it('setStatus updates status', () => {
    useArbStore.getState().setStatus('connected');
    expect(useArbStore.getState().status).toBe('connected');
  });
});
