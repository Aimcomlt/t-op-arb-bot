import { useEffect, useRef } from 'react';
import { tokenMetaUpdateZ } from '@t-op-arb-bot/types';
import { useArbStore } from '../useArbStore';

export function useWebSocket() {
  const addPair = useArbStore((s) => s.addPair ?? s.ingest);
  const setStatus = useArbStore((s) => s.setStatus);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // hard cleanup
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string | undefined;
    if (!url) {
      console.warn('VITE_WS_URL is not set');
      return;
    }
    if (wsRef.current) return; // already connected/connecting

    let attempt = 0;

    const connect = () => {
      if (!mountedRef.current) return;

      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        if (!mountedRef.current) return;
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = tokenMetaUpdateZ.parse(JSON.parse(event.data));
          // Add to store (pure action; no state writes during render)
          addPair({ ...parsed.payload, at: parsed.at });
        } catch (err) {
          // invalid or non-matching message; ignore
          // console.debug('WS parse error', err);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus('disconnected');
        wsRef.current = null;

        // exponential backoff (cap at 15s)
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will follow; status handled there
      };
    };

    connect();

    // effect cleanup (for URL change, though URL is typically constant)
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(); } catch {}
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    // `addPair` and `setStatus` from Zustand are stable; safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
