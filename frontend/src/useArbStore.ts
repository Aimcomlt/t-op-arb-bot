// frontend/src/useArbStore.ts
import { create } from 'zustand';
import type { TokenMetaUpdate } from '@t-op-arb-bot/types';

type Pair = TokenMetaUpdate['payload'] & { at: string };
type Status = 'disconnected' | 'connecting' | 'connected';

type Row = Pair & { key: string; lastUpdate: number };

interface ArbState {
  status: Status;
  rowsByKey: Record<string, Row>;      // key = `${pairSymbol}:${dex}`
  order: string[];                      // stable order of keys (optional, for fast tables)
  pairs: Pair[];                        // raw stream of pair updates

  // actions
  setStatus: (status: Status) => void;
  ingest: (pair: Pair) => void;         // upsert (dedupe)
  addPair: (pair: Pair) => void;        // append to pairs list
  ingestMany: (pairs: Pair[]) => void;  // batch upsert (snapshot bursts)
  reset: () => void;
}

function makeKey(p: Pair) {
  return `${p.pairSymbol}:${p.dex}`;
}

export const useArbStore = create<ArbState>((set, get) => ({
  status: 'disconnected',
  rowsByKey: {},
  order: [],
  pairs: [],

  setStatus: (status) => set({ status }),

  ingest: (pair) =>
    set((state) => {
      const key = makeKey(pair);
      const prev = state.rowsByKey[key];
      const next: Row = {
        ...pair,
        key,
        lastUpdate: Date.now(),
      };

      // no-op if nothing changed (prevents useless re-renders)
      if (
        prev &&
        prev.price === next.price &&
        prev.reserves.r0 === next.reserves.r0 &&
        prev.reserves.r1 === next.reserves.r1 &&
        prev.reserves.block === next.reserves.block &&
        prev.spread === next.spread &&
        prev.liquidityUSD === next.liquidityUSD
      ) {
        return state;
      }

      const rowsByKey = { ...state.rowsByKey, [key]: next };
      const order = prev ? state.order : [...state.order, key];
      return { rowsByKey, order };
    }),

  addPair: (pair) =>
    set((state) => ({ pairs: [...state.pairs, pair] })),

  ingestMany: (pairs) =>
    set((state) => {
      if (!pairs.length) return state;
      const rowsByKey = { ...state.rowsByKey };
      let orderChanged = false;
      let anyChanged = false;

      for (const pair of pairs) {
        const key = makeKey(pair);
        const prev = rowsByKey[key];
        const next: Row = { ...pair, key, lastUpdate: Date.now() };

        if (
          prev &&
          prev.price === next.price &&
          prev.reserves.r0 === next.reserves.r0 &&
          prev.reserves.r1 === next.reserves.r1 &&
          prev.reserves.block === next.reserves.block &&
          prev.spread === next.spread &&
          prev.liquidityUSD === next.liquidityUSD
        ) {
          continue;
        }

        rowsByKey[key] = next;
        anyChanged = true;
        if (!prev) orderChanged = true;
      }

      if (!anyChanged) return state;

      const order = orderChanged
        ? Array.from(new Set([...state.order, ...pairs.map(makeKey)]))
        : state.order;

      return { rowsByKey, order };
    }),

  reset: () => set({ rowsByKey: {}, order: [], pairs: [], status: 'disconnected' }),
}));
