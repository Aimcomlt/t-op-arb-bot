import { render, screen, fireEvent } from '@testing-library/react';
import LivePairsTable from './LivePairsTable';
import React from 'react';
import { vi, describe, it, expect } from 'vitest';

let status = 'connected';
vi.mock('../useArbStore', () => {
  const pairs = [
    {
      pairSymbol: 'ETH/USDC',
      dex: 'uniswap',
      price: '110',
      liquidityUSD: '200',
      at: '2024-01-01T00:00:00Z',
    },
    {
      pairSymbol: 'ETH/USDC',
      dex: 'sushiswap',
      price: '100',
      liquidityUSD: '200',
      at: '2024-01-01T00:00:00Z',
    },
  ];
  const addPair = vi.fn();
  return {
    useArbStore: (selector: any) =>
      selector({ pairs, status, addPair, ingest: addPair }),
  };
});

describe('LivePairsTable', () => {
  it('renders rows and filters by liquidity', () => {
    status = 'connected';
    render(<LivePairsTable />);
    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('ETH/USDC')).toBeInTheDocument();

    const liquidityInput = screen.getByLabelText('Min Liquidity');
    fireEvent.change(liquidityInput, { target: { value: '300' } });
    expect(screen.queryByText('ETH/USDC')).not.toBeInTheDocument();
  });

  it('disables simulate button when disconnected', () => {
    status = 'disconnected';
    render(<LivePairsTable />);
    const button = screen.getByText('Simulate') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
