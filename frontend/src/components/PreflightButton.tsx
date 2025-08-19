import React, { useState } from 'react';
import { maskToken } from '../hooks/useWebSocket';
import { useNotificationStore } from '../useNotificationStore';

function resolveToken(): string | undefined {
  const rawBase = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
  const envToken =
    (import.meta.env.VITE_WS_TOKEN as string | undefined) ??
    (import.meta.env.VITE_WS_AUTH_TOKEN as string | undefined);
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
}

export default function PreflightButton() {
  const addNotification = useNotificationStore((s) => s.add);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const token = resolveToken();
    if (!token) {
      addNotification({ type: 'error', message: 'missing token' });
      return;
    }
    setLoading(true);
    try {
      console.info('[Preflight] GET /ws-auth-check', { token: maskToken(token) });
      const res = await fetch(`/ws-auth-check?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        addNotification({ type: 'success', message: 'ws auth ok' });
      } else if (res.status === 401 || res.status === 403) {
        let err = '';
        try { err = (await res.json()).error; } catch {}
        addNotification({ type: 'error', message: `${res.status} ${err}`.trim() });
      } else {
        addNotification({ type: 'error', message: `error ${res.status}` });
      }
    } catch (e) {
      console.error('[Preflight] failed', e);
      addNotification({ type: 'error', message: 'preflight failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={run} disabled={loading} style={{ marginLeft: '1rem' }}>
      {loading ? 'Preflighting…' : 'Preflight'}
    </button>
  );
}
