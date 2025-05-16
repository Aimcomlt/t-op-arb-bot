// frontend/src/store/abieSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Opportunity {
  tokenIn: string;
  tokenOut: string;
  spread: string;
  buyOn: string;
  sellOn: string;
  estimatedProfit: string;
}

interface ExecutionStatus {
  txHash: string;
  status: 'success' | 'reverted';
  profit: string;
  gasUsed: string;
}

interface SystemLog {
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp?: number;
}

interface ABIEState {
  liveOpportunities: Opportunity[];
  executionResult: ExecutionStatus | null;
  systemLogs: SystemLog[];
}

const initialState: ABIEState = {
  liveOpportunities: [],
  executionResult: null,
  systemLogs: []
};

const abieSlice = createSlice({
  name: 'abie',
  initialState,
  reducers: {
    updateLiveOpportunity: (state, action: PayloadAction<Opportunity>) => {
      // Insert new opportunity at the top (max 25 retained)
      state.liveOpportunities.unshift(action.payload);
      if (state.liveOpportunities.length > 25) {
        state.liveOpportunities.pop();
      }
    },
    updateExecutionStatus: (state, action: PayloadAction<ExecutionStatus>) => {
      state.executionResult = action.payload;
    },
    pushSystemLog: (state, action: PayloadAction<SystemLog>) => {
      const logWithTime = {
        ...action.payload,
        timestamp: action.payload.timestamp || Date.now()
      };
      state.systemLogs.unshift(logWithTime);
      if (state.systemLogs.length > 50) {
        state.systemLogs.pop();
      }
    }
  }
});

export const {
  updateLiveOpportunity,
  updateExecutionStatus,
  pushSystemLog
} = abieSlice.actions;

export default abieSlice.reducer;
