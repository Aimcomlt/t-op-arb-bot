import React, { useState } from 'react';

interface PairInfo {
  pair: string;
  uniswapPrice?: number;
  sushiswapPrice?: number;
}

interface SimulationResult {
  gas: number;
  flashFee: number;
  netProfit: number;
}

interface Props {
  pair: PairInfo | null;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  padding: '1rem',
  borderRadius: '0.5rem',
  minWidth: '300px',
};

export default function SimulateModal({ pair, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState('0');
  const [routerOrder, setRouterOrder] = useState<'uniToSushi' | 'sushiToUni'>('uniToSushi');
  const [result, setResult] = useState<SimulationResult | null>(null);

  if (!pair) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: pair.pair,
          amount: Number(amount),
          slippageBps: Number(slippageBps),
          routerOrder,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Simulation failed', err);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Simulate {pair.pair}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label>
            Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ marginLeft: '0.25rem' }}
            />
          </label>
          <label>
            Slippage (bps)
            <input
              type="number"
              value={slippageBps}
              onChange={(e) => setSlippageBps(e.target.value)}
              style={{ marginLeft: '0.25rem' }}
            />
          </label>
          <label>
            Router Order
            <select
              value={routerOrder}
              onChange={(e) => setRouterOrder(e.target.value as any)}
              style={{ marginLeft: '0.25rem' }}
            >
              <option value="uniToSushi">Uni → Sushi</option>
              <option value="sushiToUni">Sushi → Uni</option>
            </select>
          </label>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit">Simulate</button>
            <button type="button" onClick={onClose} style={{ marginLeft: '0.5rem' }}>
              Close
            </button>
          </div>
        </form>
        {result && (
          <div style={{ marginTop: '1rem' }}>
            <div>Gas: {result.gas}</div>
            <div>Flash Fee: {result.flashFee}</div>
            <div>Net Profit: {result.netProfit}</div>
          </div>
        )}
      </div>
    </div>
  );
}

