// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { tokenMetaUpdateZ } from '@t-op-arb-bot/types';
import { useArbStore } from '../useArbStore';

// Exposed for tests/mocks; defaults to a token+json subprotocol handshake
export let openSocket = (url: string, token: string) =>
  new WebSocket(url, [`token:${token}`, 'json']);

export function maskToken(t?: string | null) {
  if (!t) return '';
  if (t.length <= 10) return '•••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

export function useWebSocket(enabled = true) {
  const addPair = useArbStore((s) => s.addPair ?? s.ingest);
  const setStatus = useArbStore((s) => s.setStatus);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);
  const code1006Ref = useRef(0);

  // ---- Resolve base URL and token from multiple sources ----
  const rawBase = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
  const envToken =
    (import.meta.env.VITE_WS_TOKEN as string | undefined) ??
    (import.meta.env.VITE_WS_AUTH_TOKEN as string | undefined);

  // Pick up token from several fallback locations (useful in dev)
  const resolvedToken = (() => {
    try {
      const fromBase = rawBase ? new URL(rawBase).searchParams.get('token') : null;
      const fromPage =
        typeof window !== 'undefined'
          ? new URL(window.location.href).searchParams.get('wsToken') ??
            new URL(window.location.href).searchParams.get('token')
          : null;
      const fromStorage =
        typeof window !== 'undefined'
          ? localStorage.getItem('WS_TOKEN') ??
            localStorage.getItem('VITE_WS_TOKEN') ??
            sessionStorage.getItem('WS_TOKEN')
          : null;

      return envToken ?? fromBase ?? fromPage ?? fromStorage ?? undefined;
    } catch {
      return envToken ?? undefined;
    }
  })();

  const forceQueryToken =
    import.meta.env.DEV &&
    (import.meta.env.VITE_WS_DEV_QUERY_TOKEN as string | undefined) === '1';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

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
    if (!enabled) {
      setStatus('disconnected');
      return;
    }

    if (!rawBase) {
      console.warn('[WS] VITE_WS_URL is not set');
      return;
    }

    if (wsRef.current) return; // already connecting/connected

    const createSocket = (): WebSocket => {
      const urlObj = new URL(rawBase);
      if (resolvedToken && forceQueryToken) {
        urlObj.searchParams.set('token', resolvedToken);
      }
      return openSocket(urlObj.toString(), resolvedToken!);
    };

    const scheduleReconnect = () => {
      if (!mountedRef.current) return;

      attemptRef.current += 1;
      const base = 1000 * 2 ** (attemptRef.current - 1);
      const jitter = Math.random() * 1000;
      const delay = Math.min(base + jitter, 20_000);

      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (!mountedRef.current) return;

      if (!resolvedToken) {
        console.warn(
          '[WS] no auth token found. Set VITE_WS_TOKEN or include ?token= in VITE_WS_URL (.env.local).'
        );
        setStatus('disconnected');
        return;
      }

      setStatus('connecting');

      let ws: WebSocket | null = null;
      let handshakeError = false;
      try {
        ws = createSocket();
      } catch (err) {
        console.error('[WS] constructor failed:', err);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;

      // Helpful connection diagnostics
      try {
        const u = new URL(rawBase);
        if (forceQueryToken && resolvedToken) u.searchParams.set('token', maskToken(resolvedToken));
        console.info('[WS] connecting', {
          url: u.toString(),
          token: resolvedToken ? maskToken(resolvedToken) : '(none)',
          queryToken: forceQueryToken,
          attempt: attemptRef.current,
        });
      } catch {}

      ws.onopen = () => {
        attemptRef.current = 0;
        code1006Ref.current = 0;
        if (!mountedRef.current) return;
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = tokenMetaUpdateZ.parse(JSON.parse(event.data));
          addPair({ ...parsed.payload, at: parsed.at });
        } catch {
          // ignore non-matching payloads
        }
      };

      ws.onclose = (e) => {
        console.warn('[WS] closed', { code: e.code, reason: e.reason });
        if (!mountedRef.current) return;

        setStatus('disconnected');
        wsRef.current = null;

        if (e.code === 1006) {
          code1006Ref.current += 1;
          if (code1006Ref.current >= 3 && typeof window !== 'undefined') {
            window.alert('Run Preflight');
          }
        } else {
          code1006Ref.current = 0;
        }

        if (!handshakeError) scheduleReconnect();
        handshakeError = false;
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        handshakeError = true;
        scheduleReconnect();
      };
    };

    connect();

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
    // Zustand selectors are stable; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
