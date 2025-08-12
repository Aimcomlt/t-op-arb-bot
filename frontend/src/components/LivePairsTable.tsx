import React, { useMemo, useState } from 'react';
import { useArbStore } from '../useArbStore';
import { shallow } from 'zustand/shallow';

interface Row {
  pair: string;
  uniswapPrice?: number;
  sushiswapPrice?: number;
  spreadBps?: number;
  liquidityUSD?: number;
  lastUpdate?: string;
}

export default function LivePairsTable() {
  const { pairs, status } = useArbStore(
    (s) => ({ pairs: s.pairs, status: s.status }),
    shallow,
  );
  const [minLiquidity, setMinLiquidity] = useState(0);
  const [minSpreadBps, setMinSpreadBps] = useState(0);
  const pairList = Array.isArray(pairs) ? pairs : [];
  if (!Array.isArray(pairs)) console.warn('LivePairsTable: pairs is not an array', pairs);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const p of pairList) {
      const existing = map.get(p.pairSymbol) ?? { pair: p.pairSymbol };
      const price = Number(p.price);
      const liquidity = p.liquidityUSD ? Number(p.liquidityUSD) : undefined;
      if (p.dex === 'uniswap') existing.uniswapPrice = price;
      if (p.dex === 'sushiswap') existing.sushiswapPrice = price;
      if (liquidity !== undefined) existing.liquidityUSD = liquidity;
      existing.lastUpdate = p.at;
      map.set(p.pairSymbol, existing);
    }
    return Array.from(map.values())
      .map((r) => {
        if (r.uniswapPrice != null && r.sushiswapPrice != null) {
          r.spreadBps =
            ((r.uniswapPrice - r.sushiswapPrice) /
              ((r.uniswapPrice + r.sushiswapPrice) / 2)) * 10000;
        }
        return r;
      })
      .filter(
        (r) =>
          (r.liquidityUSD ?? 0) >= minLiquidity &&
          (r.spreadBps ?? -Infinity) >= minSpreadBps,
      );
  }, [pairList, minLiquidity, minSpreadBps]);

  const format = (n?: number) => (n != null ? n.toFixed(2) : '-');

  const statusColor = status === 'connected' ? 'green' : 'red';

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.5rem',
            backgroundColor: statusColor,
            color: 'white',
          }}
        >
          {status}
        </span>
        <label>
          Min Liquidity
          <input
            type="number"
            value={minLiquidity}
            onChange={(e) => setMinLiquidity(Number(e.target.value))}
            style={{ marginLeft: '0.25rem' }}
          />
        </label>
        <label>
          Min Spread (bps)
          <input
            type="number"
            value={minSpreadBps}
            onChange={(e) => setMinSpreadBps(Number(e.target.value))}
            style={{ marginLeft: '0.25rem' }}
          />
        </label>
      </div>
      <table>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Uniswap Price</th>
            <th>SushiSwap Price</th>
            <th>Spread (bps)</th>
            <th>Liquidity USD</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pair}>
              <td>{r.pair}</td>
              <td>{format(r.uniswapPrice)}</td>
              <td>{format(r.sushiswapPrice)}</td>
              <td
                style={{
                  color:
                    r.spreadBps != null && r.spreadBps < 0
                      ? 'red'
                      : r.spreadBps != null && r.spreadBps > minSpreadBps
                        ? 'green'
                        : undefined,
                }}
              >
                {r.spreadBps != null ? r.spreadBps.toFixed(2) : '-'}
              </td>
              <td>{format(r.liquidityUSD)}</td>
              <td>
                {r.lastUpdate ? new Date(r.lastUpdate).toLocaleTimeString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
