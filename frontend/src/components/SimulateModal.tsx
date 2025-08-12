import React, { useState, useEffect, useRef } from 'react';
import { compoundedMinOut } from '../../../packages/core/src/utils/slippage.ts';
import { useNotificationStore } from '../useNotificationStore';

interface PairInfo {
  pair: string;
  uniswapPrice?: number;
  sushiswapPrice?: number;
}

interface SimulationResult {
  gasUsed: number;
  flashFee: number;
  cost?: number;
  netAfterGas: number;
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
  const [minOut, setMinOut] = useState<string>('0');
  const [canSimulate, setCanSimulate] = useState(true);
  const addNotification = useNotificationStore((s) => s.add);
  const warnedRef = useRef(false);

  if (!pair) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSimulate) return;
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
      const gasUsed = Number(data.gasUsed ?? data.gas ?? 0);
      const flashFee = Number(data.flashFee ?? 0);
      const cost = Number(data.cost ?? 0);
      const quote = Number(data.quote ?? 0);
      const netAfterGas = quote - Number(amount || 0) - cost;
      setResult({ gasUsed, flashFee, cost, netAfterGas });
    } catch (err) {
      console.error('Simulation failed', err);
      addNotification({ type: 'error', message: 'Simulation failed' });
    }
  };

  useEffect(() => {
    const amt = Number(amount);
    const slip = Number(slippageBps);
    const uniPrice = pair.uniswapPrice ?? 0;
    const sushiPrice = pair.sushiswapPrice ?? 0;
    if (!amt || !uniPrice || !sushiPrice) {
      setMinOut('0');
      setCanSimulate(true);
      return;
    }
    const firstPrice = routerOrder === 'uniToSushi' ? uniPrice : sushiPrice;
    const secondPrice = routerOrder === 'uniToSushi' ? sushiPrice : uniPrice;
    const mid = (uniPrice + sushiPrice) / 2;
    const impact1 = mid === 0 ? 0 : (Math.abs(firstPrice - mid) / mid) * 10000;
    const impact2 = mid === 0 ? 0 : (Math.abs(secondPrice - mid) / mid) * 10000;
    const ok = impact1 <= slip && impact2 <= slip;
    setCanSimulate(ok);
    if (!ok && !warnedRef.current) {
      addNotification({ type: 'warning', message: 'Price impact exceeds slippage' });
      warnedRef.current = true;
    }
    if (ok) warnedRef.current = false;
    const quote1 = amt * firstPrice;
    const quote2 = quote1 / secondPrice;
    const min = compoundedMinOut(
      [BigInt(Math.floor(quote1)), BigInt(Math.floor(quote2))],
      slip,
    );
    setMinOut(min.toString());
  }, [amount, slippageBps, routerOrder, pair]);

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
          <div>Min Out: {minOut}</div>
          {!canSimulate && (
            <div style={{ color: 'red' }}>Price impact exceeds slippage</div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={!canSimulate}>
              Simulate
            </button>
            <button type="button" onClick={onClose} style={{ marginLeft: '0.5rem' }}>
              Close
            </button>
          </div>
        </form>
        {result && (
          <div style={{ marginTop: '1rem' }}>
            <div>Gas Used: {result.gasUsed}</div>
            <div>Flash Fee: {result.flashFee}</div>
            {result.cost != null && <div>Cost: {result.cost}</div>}
            <div
              style={{ color: result.netAfterGas < 0 ? 'red' : 'green' }}
            >
              Net after gas: {result.netAfterGas}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

