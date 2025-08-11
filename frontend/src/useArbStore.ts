import { create } from 'zustand';
import type { TokenMetaUpdate } from '@t-op-arb-bot/types';

type Pair = TokenMetaUpdate['payload'] & { at: string };

type Status = 'disconnected' | 'connected';

interface ArbState {
  pairs: Pair[];
  status: Status;
  addPair: (pair: Pair) => void;
  setStatus: (status: Status) => void;
}

export const useArbStore = create<ArbState>((set) => ({
  pairs: [],
  status: 'disconnected',
  addPair: (pair) => set((s) => ({ pairs: [...s.pairs, pair] })),
  setStatus: (status) => set({ status }),
}));
