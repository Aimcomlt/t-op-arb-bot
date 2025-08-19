// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { tokenMetaUpdateZ } from '@t-op-arb-bot/types';
import { useArbStore } from '../useArbStore';

type AuthMode = 'query' | 'subprotocol' | 'none';

function maskToken(t?: string | null) {
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

  const forcedMode = import.meta.env.VITE_WS_AUTH_MODE as AuthMode | undefined;
  // Default to sending the token as a query parameter; fall back modes are
  // retained for logging but the handshake will always include the token.
  const authModeRef = useRef<AuthMode>(forcedMode ?? 'query');

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

    const openSocket = (_mode: AuthMode): WebSocket => {
      const urlObj = new URL(rawBase);
      if (resolvedToken) {
        // Ensure the token is always sent. Append as a query param (avoids proxy
        // stripping) and also advertise it via subprotocol for servers that
        // expect an Authorization header.
        if (!urlObj.searchParams.get('token')) {
          urlObj.searchParams.set('token', resolvedToken);
        }
        return new WebSocket(urlObj.toString(), ['bearer', resolvedToken]);
      }
      return new WebSocket(urlObj.toString());
    };

    const scheduleReconnect = (immediate = false) => {
      if (!mountedRef.current) return;

      attemptRef.current += 1;
      const backoff = Math.min(1000 * 2 ** attemptRef.current, 15_000);
      const delay = immediate ? 0 : backoff;

      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (!mountedRef.current) return;

      const mode = authModeRef.current;

      if (!resolvedToken) {
        console.warn(
          '[WS] no auth token found. Set VITE_WS_TOKEN or include ?token= in VITE_WS_URL (.env.local).'
        );
        setStatus('disconnected');
        return;
      }

      setStatus('connecting');

      let ws: WebSocket | null = null;
      try {
        ws = openSocket(mode);
      } catch (err) {
        console.error('[WS] constructor failed:', err);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;

      // Helpful connection diagnostics
      try {
        const u = new URL(rawBase);
        const willSendQuery =
          mode === 'query' &&
          (!!u.searchParams.get('token') || !!resolvedToken);
        console.info('[WS] connecting', {
          url: willSendQuery && resolvedToken ? `${u.origin}${u.pathname}?token=${maskToken(resolvedToken)}` : u.toString(),
          mode,
          token: resolvedToken ? maskToken(resolvedToken) : '(none)',
          forcedMode: forcedMode ?? '(auto)',
          attempt: attemptRef.current,
        });
      } catch {}

      ws.onopen = () => {
        attemptRef.current = 0;
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

        // Handshake/auth rejections in browsers are often surfaced as 1006 (no clean close).
        if (e.code === 1006 || e.code === 1008 || /unauth|auth|policy|401/i.test(e.reason)) {
          scheduleReconnect(true); // immediate retry
        } else {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        // onclose will follow; handled there
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
