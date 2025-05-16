// frontend/src/hooks/useABIECommand.ts

import { useRef, useCallback, useEffect } from 'react';

/**
 * useABIECommand Hook
 * 
 * This hook provides a way for frontend components (e.g. dashboards or admin tools)
 * to send commands to the ABIE backend via WebSocket.
 * 
 * Commands include:
 * - Adjusting slippage tolerance
 * - Toggling debug mode
 * - Triggering manual cache clears
 * - Fetching backend status
 */

export const useABIECommand = () => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection on mount
    const ws = new WebSocket('ws://localhost:7777');
    wsRef.current = ws;

    ws.onopen = () => console.log('[ABIE] Command channel ready.');
    ws.onclose = () => console.warn('[ABIE] Command channel closed.');

    return () => {
      ws.close();
    };
  }, []);

  /**
   * Sends a command to the ABIE backend.
   * @param type - Command string (e.g. "adjust_slippage")
   * @param data - Payload object (e.g. { pairSymbol, newTolerance })
   */
  const sendCommand = useCallback((type: string, data: Record<string, any>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[ABIE] Command WebSocket not connected.');
      return;
    }

    const command = JSON.stringify({ type, data });
    wsRef.current.send(command);
  }, []);

  return { sendCommand };
};
