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

  it('addPair appends to pairs array', () => {
    useArbStore.getState().addPair(samplePair);
    const state = useArbStore.getState();
    expect(state.pairs).toHaveLength(1);
    expect(state.pairs[0]).toEqual(samplePair);
  });

  it('setStatus updates status', () => {
    useArbStore.getState().setStatus('connected');
    expect(useArbStore.getState().status).toBe('connected');
  });
});
