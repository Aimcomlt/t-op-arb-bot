// frontend/src/hooks/useABIE.ts

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateLiveOpportunity, updateExecutionStatus, pushSystemLog } from '../store/abieSlice';

/**
 * useABIE Hook
 * 
 * Connects to the ABIE WebSocket server and listens to real-time broadcasted
 * arbitrage events such as sync updates, opportunities, and execution results.
 */
export const useABIE = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:7777');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ABIE] Connected to backend broadcast channel.');
    };

    ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);

        switch (type) {
          case 'arb_opportunity':
            dispatch(updateLiveOpportunity(data));
            break;

          case 'execution_result':
            dispatch(updateExecutionStatus(data));
            break;

          case 'system_log':
            dispatch(pushSystemLog(data));
            break;

          default:
            console.warn('[ABIE] Unknown message type:', type);
            break;
        }
      } catch (err) {
        console.error('[ABIE] Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('[ABIE] Connection closed.');
    };

    return () => {
      ws.close();
    };
  }, [dispatch]);
};
